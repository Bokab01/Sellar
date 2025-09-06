import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModerationRequest {
  listing_id: string
  user_id: string
  title: string
  description: string
  image_urls?: string[]
  category?: string
}

interface ModerationResult {
  approved: boolean
  confidence_score: number
  flagged_categories: string[]
  reasons: string[]
  auto_action: string
}

// OpenAI Moderation API
async function moderateText(text: string): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-moderation-latest'
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('OpenAI moderation error:', error)
    throw error
  }
}

// Google Cloud Vision SafeSearch
async function moderateImage(imageUrl: string): Promise<any> {
  const googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY')
  if (!googleApiKey) {
    throw new Error('Google Cloud API key not configured')
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl
                }
              },
              features: [
                {
                  type: 'SAFE_SEARCH_DETECTION',
                  maxResults: 1
                }
              ]
            }
          ]
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Google Vision moderation error:', error)
    throw error
  }
}

// Keyword filtering
async function checkKeywords(text: string, supabase: any): Promise<string[]> {
  const { data: keywords } = await supabase
    .from('keyword_blacklist')
    .select('keyword, match_type, severity_level')
    .eq('is_active', true)

  const flaggedKeywords: string[] = []
  const lowerText = text.toLowerCase()

  for (const item of keywords || []) {
    const keyword = item.keyword.toLowerCase()
    
    switch (item.match_type) {
      case 'exact':
        if (lowerText.includes(keyword)) {
          flaggedKeywords.push(item.keyword)
        }
        break
      case 'partial':
        if (lowerText.includes(keyword)) {
          flaggedKeywords.push(item.keyword)
        }
        break
      case 'regex':
        try {
          const regex = new RegExp(keyword, 'gi')
          if (regex.test(text)) {
            flaggedKeywords.push(item.keyword)
          }
        } catch (e) {
          console.error('Invalid regex:', keyword, e)
        }
        break
    }
  }

  return flaggedKeywords
}

// Main moderation function
async function moderateContent(request: ModerationRequest, supabase: any): Promise<ModerationResult> {
  const result: ModerationResult = {
    approved: true,
    confidence_score: 0,
    flagged_categories: [],
    reasons: [],
    auto_action: 'approve'
  }

  const fullText = `${request.title} ${request.description}`
  
  try {
    // 1. Keyword filtering (fastest, cheapest)
    const flaggedKeywords = await checkKeywords(fullText, supabase)
    if (flaggedKeywords.length > 0) {
      result.approved = false
      result.confidence_score = 1.0
      result.flagged_categories.push('keyword_violation')
      result.reasons.push(`Flagged keywords: ${flaggedKeywords.join(', ')}`)
      result.auto_action = 'reject'
      
      // Log the keyword violation
      await supabase.from('moderation_logs').insert({
        listing_id: request.listing_id,
        user_id: request.user_id,
        moderation_type: 'keyword',
        status: 'rejected',
        confidence_score: 1.0,
        flagged_content: { keywords: flaggedKeywords },
        auto_action_taken: 'reject'
      })
      
      return result
    }

    // 2. Check user reputation for moderation threshold
    const { data: userRep } = await supabase
      .rpc('should_apply_strict_moderation', { user_uuid: request.user_id })
    
    const isStrictMode = userRep === true
    const threshold = isStrictMode ? 0.3 : 0.7

    // 3. OpenAI text moderation
    const textModeration = await moderateText(fullText)
    const textResult = textModeration.results[0]
    
    if (textResult.flagged) {
      const categories = Object.keys(textResult.categories).filter(
        key => textResult.categories[key]
      )
      const scores = Object.keys(textResult.category_scores).map(
        key => textResult.category_scores[key]
      )
      const maxScore = Math.max(...scores)
      
      if (maxScore > threshold) {
        result.approved = false
        result.confidence_score = maxScore
        result.flagged_categories.push(...categories)
        result.reasons.push(`AI detected: ${categories.join(', ')}`)
        result.auto_action = maxScore > 0.8 ? 'reject' : 'flag'
      }
    }

    // 4. Image moderation (if images provided)
    if (request.image_urls && request.image_urls.length > 0) {
      for (const imageUrl of request.image_urls.slice(0, 3)) { // Limit to 3 images for cost
        try {
          const imageModeration = await moderateImage(imageUrl)
          const safeSearch = imageModeration.responses[0]?.safeSearchAnnotation
          
          if (safeSearch) {
            const risks = ['adult', 'violence', 'racy']
            const highRiskLevels = ['LIKELY', 'VERY_LIKELY']
            
            for (const risk of risks) {
              if (highRiskLevels.includes(safeSearch[risk])) {
                result.approved = false
                result.confidence_score = Math.max(result.confidence_score, 0.9)
                result.flagged_categories.push(`image_${risk}`)
                result.reasons.push(`Image contains ${risk} content`)
                result.auto_action = 'reject'
              }
            }
          }
        } catch (error) {
          console.error('Image moderation failed for:', imageUrl, error)
          // Don't fail the entire moderation for image errors
        }
      }
    }

    // 5. Log moderation result
    await supabase.from('moderation_logs').insert({
      listing_id: request.listing_id,
      user_id: request.user_id,
      moderation_type: 'ai_combined',
      status: result.approved ? 'approved' : 'rejected',
      confidence_score: result.confidence_score,
      flagged_content: {
        categories: result.flagged_categories,
        reasons: result.reasons,
        strict_mode: isStrictMode
      },
      ai_response: {
        text_moderation: textResult,
        threshold_used: threshold
      },
      auto_action_taken: result.auto_action
    })

    // 6. Update listing status
    await supabase
      .from('listings')
      .update({
        moderation_status: result.approved ? 'approved' : 'rejected',
        moderation_score: result.confidence_score,
        flagged_reasons: result.reasons,
        auto_moderated_at: new Date().toISOString()
      })
      .eq('id', request.listing_id)

    return result

  } catch (error) {
    console.error('Moderation error:', error)
    
    // Log the error
    await supabase.from('moderation_logs').insert({
      listing_id: request.listing_id,
      user_id: request.user_id,
      moderation_type: 'ai_combined',
      status: 'error',
      flagged_content: { error: error.message },
      auto_action_taken: 'flag'
    })

    // In case of error, flag for manual review
    return {
      approved: false,
      confidence_score: 0.5,
      flagged_categories: ['moderation_error'],
      reasons: ['Moderation system error - requires manual review'],
      auto_action: 'flag'
    }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { listing_id, user_id, title, description, image_urls, category } = await req.json()

    if (!listing_id || !user_id || !title || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const moderationRequest: ModerationRequest = {
      listing_id,
      user_id,
      title,
      description,
      image_urls,
      category
    }

    const result = await moderateContent(moderationRequest, supabaseClient)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        approved: false,
        auto_action: 'flag'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
