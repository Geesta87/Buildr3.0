import { NextRequest, NextResponse } from "next/server";

// Unsplash API endpoint
const UNSPLASH_API = "https://api.unsplash.com";

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const count = parseInt(searchParams.get("count") || "5");
  const orientation = searchParams.get("orientation") || "landscape"; // landscape, portrait, squarish

  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    // Return placeholder images if no API key
    return NextResponse.json({
      photos: generatePlaceholders(query, count),
      source: "placeholder"
    });
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=${orientation}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    
    const photos = data.results.map((photo: UnsplashPhoto) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.small,
      alt: photo.alt_description || photo.description || query,
      credit: {
        name: photo.user.name,
        username: photo.user.username,
        link: `https://unsplash.com/@${photo.user.username}?utm_source=buildr&utm_medium=referral`
      },
      width: photo.width,
      height: photo.height
    }));

    return NextResponse.json({ photos, source: "unsplash" });
  } catch (error) {
    console.error("Unsplash API error:", error);
    // Fallback to placeholders on error
    return NextResponse.json({
      photos: generatePlaceholders(query, count),
      source: "placeholder"
    });
  }
}

// Generate placeholder images when Unsplash is unavailable
function generatePlaceholders(query: string, count: number) {
  const placeholders = [];
  
  // Use high-quality placeholder services
  for (let i = 0; i < count; i++) {
    const width = 1200;
    const height = 800;
    // Use picsum.photos which provides real stock photos
    placeholders.push({
      id: `placeholder-${i}`,
      url: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/${width}/${height}`,
      thumb: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/400/300`,
      alt: query,
      credit: null,
      width,
      height
    });
  }
  
  return placeholders;
}

// POST endpoint for batch image search (multiple queries at once)
export async function POST(request: NextRequest) {
  try {
    const { queries } = await request.json();
    
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: "Queries array required" }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!accessKey) {
      // Return placeholders for each query
      const results: Record<string, unknown[]> = {};
      for (const query of queries) {
        results[query] = generatePlaceholders(query, 3);
      }
      return NextResponse.json({ results, source: "placeholder" });
    }

    const results: Record<string, unknown[]> = {};
    
    // Fetch images for each query (with rate limiting consideration)
    for (const query of queries.slice(0, 10)) { // Limit to 10 queries
      try {
        const response = await fetch(
          `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
          {
            headers: {
              Authorization: `Client-ID ${accessKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          results[query] = data.results.map((photo: UnsplashPhoto) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumb: photo.urls.small,
            alt: photo.alt_description || query,
            credit: {
              name: photo.user.name,
              username: photo.user.username,
            }
          }));
        } else {
          results[query] = generatePlaceholders(query, 3);
        }
      } catch {
        results[query] = generatePlaceholders(query, 3);
      }
    }

    return NextResponse.json({ results, source: "unsplash" });
  } catch (error) {
    console.error("Batch Unsplash error:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
