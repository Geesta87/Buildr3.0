import { NextRequest, NextResponse } from "next/server";

const PEXELS_API = "https://api.pexels.com/v1";
const PEXELS_VIDEO_API = "https://api.pexels.com/videos";

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
