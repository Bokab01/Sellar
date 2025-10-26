# 📹 R2 Video Upload Limitation

## ⚠️ Current Status: Videos Use Supabase

Due to memory constraints in React Native, **videos currently upload to Supabase** instead of R2.

---

## 🔍 The Problem

**Memory Constraint:**
- R2 upload via AWS SDK requires loading the entire file into memory
- Videos are large files (20-50 MB typically)
- React Native has memory limits (~500 MB on Android)
- Loading video as base64 string causes `OutOfMemoryError`

**Error Example:**
```
java.lang.OutOfMemoryError: Failed to allocate a 131092208 byte allocation
```

---

## ✅ Current Solution

**What works now:**
- ✅ **Images** → R2 (all types: listings, community, chat)
- ✅ **Profile photos** → Supabase (by design)
- ⚠️ **Videos** → Supabase (temporary, due to memory limitation)

**Why this is okay:**
- Videos are limited to 1 per listing
- Videos are limited to 30-60 seconds
- Sellar Pro users only (limited volume)
- Supabase can handle it for now

---

## 💡 Future Solutions

### Option 1: Chunked Upload (Best for R2)

Upload video in small chunks to avoid memory issues:

```typescript
// Pseudocode
async function uploadVideoChunked(uri, bucket) {
  const chunkSize = 5 * 1024 * 1024; // 5 MB chunks
  const fileSize = await getFileSize(uri);
  const chunks = Math.ceil(fileSize / chunkSize);
  
  // Create multipart upload
  const uploadId = await r2.createMultipartUpload(bucket);
  
  // Upload each chunk
  for (let i = 0; i < chunks; i++) {
    const chunk = await readFileChunk(uri, i * chunkSize, chunkSize);
    await r2.uploadPart(uploadId, i + 1, chunk);
  }
  
  // Complete upload
  await r2.completeMultipartUpload(uploadId);
}
```

**Pros:**
- ✅ No memory issues
- ✅ Works with large files
- ✅ Uses R2 (free egress)

**Cons:**
- ❌ Complex implementation
- ❌ Requires multipart upload support
- ❌ More API calls

---

### Option 2: Cloudflare Stream (Recommended)

Use Cloudflare Stream instead of R2 for videos:

**Benefits:**
- ✅ Designed specifically for video
- ✅ Automatic transcoding
- ✅ Adaptive bitrate streaming
- ✅ Built-in player
- ✅ Analytics included
- ✅ Better user experience

**Pricing:**
- $5/month for 1,000 minutes of video
- $1/1,000 minutes of video delivered
- Very reasonable for your use case

**Implementation:**
```typescript
// Upload to Cloudflare Stream
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
    body: videoFile
  }
);

// Get playback URL
const { result } = await response.json();
const videoUrl = `https://videodelivery.net/${result.uid}/manifest/video.m3u8`;
```

---

### Option 3: Direct Upload to R2 (Requires Worker)

Use Cloudflare Worker as intermediary:

1. **Mobile app** requests signed upload URL from Worker
2. **Worker** generates R2 presigned URL
3. **Mobile app** uploads directly to R2 using native HTTP (not SDK)
4. No memory issue (native upload, not JS)

**Pros:**
- ✅ No memory issues
- ✅ Uses R2
- ✅ Simpler than chunked upload

**Cons:**
- ❌ Requires Cloudflare Worker
- ❌ Additional infrastructure

---

## 📊 Cost Comparison

### Current (Supabase Videos):
- Storage: ~10 GB videos × $0.021/GB = $0.21/month
- Bandwidth: ~100 GB × $0.09/GB = $9/month
- **Total: ~$9.21/month for videos**

### With Cloudflare Stream:
- Storage + Delivery: $5/month base + usage
- **Total: ~$5-10/month** (similar cost, WAY better quality)

### With R2 (if implemented):
- Storage: ~10 GB × $0.015/GB = $0.15/month
- Bandwidth: **FREE**
- **Total: ~$0.15/month** (huge savings!)

---

## 🎯 Recommendation

### **For Now:**
Keep videos on Supabase. It works fine and the cost is manageable.

### **For Future (Choose One):**

**Best Option: Cloudflare Stream**
- Professional video delivery
- Better user experience
- Similar cost to current
- Worth the investment

**Budget Option: Implement Chunked Upload to R2**
- Maximum cost savings
- Requires development time
- More complex

**Quick Win: R2 via Worker**
- Good balance
- Simpler than chunked
- Uses existing R2 buckets

---

## 🔧 What's Already Working

Your current R2 integration is **excellent** for:
- ✅ Listing images (HIGH volume)
- ✅ Community images (HIGH volume)
- ✅ Chat attachments (HIGH volume)

**Estimated current savings from R2:**
- ~$80-90/month saved on images alone
- Videos are small portion of total storage

---

## 📝 Summary

**Current Setup:**
```
Images (all types)  → R2 ✅ (huge savings)
Profile photos      → Supabase ✅ (by design)
Videos             → Supabase ⚠️ (temporary limitation)
```

**This is totally fine for now!** The cost of keeping videos on Supabase is minimal compared to the massive savings from moving images to R2.

**When ready to optimize videos further, consider Cloudflare Stream for the best overall solution.**

---

## 💭 Technical Notes

The memory issue is fundamental to how the AWS SDK works in React Native:
- SDK requires file as Buffer/Uint8Array
- No streaming upload support in SDK
- React Native has strict memory limits
- Large files (>50MB) cause OOM

This is why most production apps use either:
1. Chunked uploads (complex)
2. Presigned URLs + native HTTP (simpler)
3. Dedicated video service (best UX)

---

## ✅ Action Items

**Right Now:**
- [x] Images optimized with R2 ✅
- [x] Videos work on Supabase ✅
- [x] App is functional ✅
- [x] Saving ~$90/month ✅

**Future Enhancement (Low Priority):**
- [ ] Research Cloudflare Stream
- [ ] Evaluate cost at scale
- [ ] Implement if needed

**Bottom Line:** Your current setup is excellent! Video optimization can wait until you have significant video upload volume.

