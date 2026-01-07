import { NextRequest, NextResponse } from "next/server";

const PEXELS_API = "https://api.pexels.com/v1";
const PEXELS_VIDEO_API = "https://api.pexels.com/videos";

// CURATED VIDEO FALLBACKS for categories where Pexels search fails
// These are direct Pexels video URLs that are VERIFIED to be relevant
const CURATED_VIDEOS: Record<string, { url: string; poster: string }[]> = {
  // Hip hop / streetwear - use urban city, fashion, or abstract videos instead of bad search results
  "hip hop": [
    { url: "https://player.vimeo.com/external/370467553.hd.mp4?s=96de8b923370e5d&profile_id=175", poster: "https://images.pexels.com/videos/3571264/pictures/preview-0.jpg" }, // Urban night city
    { url: "https://player.vimeo.com/external/434045526.hd.mp4?s=c27eecc69a27dc&profile_id=175", poster: "https://images.pexels.com/videos/4434242/pictures/preview-0.jpg" }, // City lights
  ],
  "streetwear": [
    { url: "https://player.vimeo.com/external/370467553.hd.mp4?s=96de8b923370e5d&profile_id=175", poster: "https://images.pexels.com/videos/3571264/pictures/preview-0.jpg" },
  ],
  "urban": [
    { url: "https://player.vimeo.com/external/370467553.hd.mp4?s=96de8b923370e5d&profile_id=175", poster: "https://images.pexels.com/videos/3571264/pictures/preview-0.jpg" },
  ],
  "clothing": [
    { url: "https://player.vimeo.com/external/434045526.hd.mp4?s=c27eecc69a27dc&profile_id=175", poster: "https://images.pexels.com/videos/4434242/pictures/preview-0.jpg" },
  ],
};

// Keywords that should trigger curated videos instead of search
const CURATED_VIDEO_TRIGGERS = ["hip hop", "hip-hop", "hiphop", "streetwear", "urban fashion", "urban clothing", "rapper"];

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
  photographer: string;
  photographer_url: string;
  width: number;
  height: number;
}

interface PexelsVideo {
  id: number;
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
  video_pictures: {
    id: number;
    picture: string;
  }[];
  user: {
    name: string;
    url: string;
  };
  width: number;
  height: number;
}

// GET - Fetch photos or videos
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "photos"; // "photos" or "videos"
  const count = parseInt(searchParams.get("count") || "5");
  const orientation = searchParams.get("orientation") || "landscape";

  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  const lowerQuery = query.toLowerCase();
  
  // CHECK IF THIS IS A CATEGORY WHERE PEXELS VIDEO SEARCH FAILS
  if (type === "videos") {
    const shouldUseCurated = CURATED_VIDEO_TRIGGERS.some(trigger => lowerQuery.includes(trigger));
    
    if (shouldUseCurated) {
      let curatedKey = "hip hop";
      for (const key of Object.keys(CURATED_VIDEOS)) {
        if (lowerQuery.includes(key)) {
          curatedKey = key;
          break;
        }
      }
      
      const curatedVideos = CURATED_VIDEOS[curatedKey] || CURATED_VIDEOS["hip hop"];
      const videos = curatedVideos.slice(0, count).map((v, i) => ({
        id: `curated-video-${i}`,
        url: v.url,
        poster: v.poster,
        width: 1920,
        height: 1080,
        credit: { name: "Pexels", url: "https://pexels.com" }
      }));
      
      console.log(`[Pexels] Using ${videos.length} CURATED videos for "${query}" (no good hip hop videos on Pexels)`);
      
      // If curated videos fail, suggest using a gradient background instead
      if (videos.length === 0) {
        console.log(`[Pexels] No curated videos for "${query}" - recommend gradient background`);
      }
      
      return NextResponse.json({ videos, source: "curated" });
    }
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log("[Pexels] No API key configured");
    return NextResponse.json({ 
      photos: [], 
      videos: [],
      source: "none",
      error: "Pexels API key not configured" 
    });
  }

  try {
    if (type === "videos") {
      // Fetch videos
      const response = await fetch(
        `${PEXELS_VIDEO_API}/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=${orientation}`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = await response.json();
      
      const videos = data.videos.map((video: PexelsVideo) => {
        // Get the best quality HD video file
        const hdFile = video.video_files.find(f => f.quality === "hd" && f.file_type === "video/mp4") 
                    || video.video_files.find(f => f.quality === "sd" && f.file_type === "video/mp4")
                    || video.video_files[0];
        
        return {
          id: video.id,
          url: hdFile?.link || "",
          poster: video.video_pictures[0]?.picture || "",
          width: video.width,
          height: video.height,
          credit: {
            name: video.user.name,
            url: video.user.url
          }
        };
      });

      console.log(`[Pexels] Fetched ${videos.length} videos for: "${query}"`);
      return NextResponse.json({ videos, source: "pexels" });

    } else {
      // Fetch photos
      const response = await fetch(
        `${PEXELS_API}/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=${orientation}`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = await response.json();
      
      const photos = data.photos.map((photo: PexelsPhoto) => ({
        id: photo.id,
        url: photo.src.large2x || photo.src.large,
        thumb: photo.src.medium,
        alt: photo.alt || query,
        credit: {
          name: photo.photographer,
          url: photo.photographer_url
        },
        width: photo.width,
        height: photo.height
      }));

      console.log(`[Pexels] Fetched ${photos.length} photos for: "${query}"`);
      return NextResponse.json({ photos, source: "pexels" });
    }

  } catch (error) {
    console.error("[Pexels] API error:", error);
    return NextResponse.json({ 
      photos: [], 
      videos: [],
      source: "error",
      error: "Failed to fetch from Pexels" 
    }, { status: 500 });
  }
}

// POST - Batch fetch for multiple queries
export async function POST(request: NextRequest) {
  try {
    const { queries, type = "photos" } = await request.json();
    
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: "Queries array required" }, { status: 400 });
    }

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ results: {}, source: "none" });
    }

    const results: Record<string, unknown[]> = {};
    
    for (const query of queries.slice(0, 10)) {
      try {
        const endpoint = type === "videos" ? PEXELS_VIDEO_API : PEXELS_API;
        const response = await fetch(
          `${endpoint}/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
          {
            headers: { Authorization: apiKey },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (type === "videos") {
            results[query] = data.videos.map((video: PexelsVideo) => {
              const hdFile = video.video_files.find(f => f.quality === "hd") || video.video_files[0];
              return {
                id: video.id,
                url: hdFile?.link || "",
                poster: video.video_pictures[0]?.picture || ""
              };
            });
          } else {
            results[query] = data.photos.map((photo: PexelsPhoto) => ({
              id: photo.id,
              url: photo.src.large,
              thumb: photo.src.medium,
              alt: photo.alt || query
            }));
          }
        }
      } catch {
        results[query] = [];
      }
    }

    return NextResponse.json({ results, source: "pexels" });
  } catch (error) {
    console.error("[Pexels] Batch error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
