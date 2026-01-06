import { NextRequest, NextResponse } from "next/server";

// Replicate API for AI image generation
// Uses Stable Diffusion XL for high-quality images

export async function POST(request: NextRequest) {
  try {
    const { prompt, businessType } = await request.json();
    
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Replicate API key not configured" },
        { status: 500 }
      );
    }

    // Enhance prompt for better business-relevant images
    const enhancedPrompt = buildImagePrompt(prompt, businessType);
    
    console.log(`[Replicate] Generating image for: ${businessType}`);
    console.log(`[Replicate] Prompt: ${enhancedPrompt}`);

    // Start the prediction
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Using SDXL for best quality
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: enhancedPrompt,
          negative_prompt: "blurry, low quality, distorted, ugly, text, watermark, logo, cartoon, anime, illustration, drawing, painting, sketch, grainy, noisy",
          width: 1024,
          height: 768,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Replicate] API error:", error);
      return NextResponse.json({ error: "Failed to start image generation" }, { status: 500 });
    }

    const prediction = await response.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            "Authorization": `Token ${apiKey}`,
          },
        }
      );
      result = await pollResponse.json();
    }

    if (result.status === "failed") {
      console.error("[Replicate] Generation failed:", result.error);
      return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
    }

    console.log(`[Replicate] Success! Image URL: ${result.output?.[0]}`);
    
    return NextResponse.json({
      imageUrl: result.output?.[0],
      prompt: enhancedPrompt,
    });

  } catch (error) {
    console.error("[Replicate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}

// Build optimized prompts for different business types
function buildImagePrompt(userPrompt: string, businessType: string): string {
  const businessPrompts: Record<string, string> = {
    // Home Services
    plumbing: "professional plumber working on modern bathroom pipes, clean uniform, high-end residential setting, natural lighting, photorealistic, 8k quality",
    hvac: "HVAC technician installing modern air conditioning unit, professional uniform, residential home exterior, blue sky, photorealistic, high quality",
    electrical: "professional electrician working on electrical panel, safety gear, modern home, clean and organized, photorealistic, commercial photography",
    roofing: "professional roofers working on beautiful suburban home, clear blue sky, modern architecture, aerial view, photorealistic",
    cleaning: "professional cleaning service in modern luxury home, sparkling clean surfaces, natural light, photorealistic, high-end interior",
    landscaping: "beautiful landscaped garden with professional gardener, lush green lawn, colorful flowers, suburban home, golden hour lighting",
    painting: "professional painter with roller painting modern interior wall, clean drop cloths, fresh paint, bright room, photorealistic",
    
    // Food & Dining
    restaurant: "elegant restaurant interior, warm ambient lighting, beautifully plated gourmet food, fine dining atmosphere, photorealistic, food photography",
    cafe: "cozy modern cafe interior, latte art coffee, pastries display, natural light through windows, rustic wood tables, photorealistic",
    bakery: "artisan bakery display with fresh bread and pastries, warm lighting, rustic wooden shelves, steam rising, photorealistic, food photography",
    
    // Fitness & Wellness
    fitness: "modern gym interior with professional equipment, motivational atmosphere, natural lighting, people exercising, photorealistic, sports photography",
    gym: "high-end fitness center with weight training area, clean modern design, professional lighting, athletic atmosphere, photorealistic",
    yoga: "serene yoga studio with natural light, wooden floors, plants, peaceful atmosphere, person in yoga pose, photorealistic, wellness photography",
    spa: "luxury spa interior with massage room, candles, orchids, zen atmosphere, warm lighting, relaxation, photorealistic",
    
    // Professional Services
    lawyer: "modern law office interior, professional meeting room, city skyline view, leather chairs, bookshelves, confident attorney, photorealistic",
    dental: "modern dental clinic, friendly dentist with patient, clean white interior, professional equipment, warm lighting, photorealistic, medical photography",
    medical: "modern medical clinic waiting room, clean and welcoming, natural light, comfortable seating, healthcare professionals, photorealistic",
    accounting: "professional office with financial advisor meeting client, modern desk, city view, confident businessperson, photorealistic",
    
    // Tech & Digital
    agency: "creative agency office, modern workspace, designers collaborating, multiple monitors, contemporary furniture, natural light, photorealistic",
    saas: "modern tech office, software developers at work, multiple screens showing code, contemporary design, collaborative atmosphere, photorealistic",
    
    // Automotive
    auto: "professional auto mechanic in modern garage, working on car engine, clean organized shop, professional lighting, photorealistic",
    
    // Real Estate
    realestate: "luxury modern home exterior, beautiful landscaping, blue sky, architectural photography, real estate listing quality, photorealistic",
    
    // Pet Services
    dog: "professional dog groomer with happy golden retriever, modern grooming salon, clean and bright, pet photography, photorealistic",
    pet: "modern pet care facility, happy pets, professional staff, clean environment, warm lighting, photorealistic",
    
    // Default
    business: "professional modern office interior, successful business team, natural lighting, contemporary design, corporate photography, photorealistic",
  };

  // Find matching business type
  const lowerType = businessType.toLowerCase();
  for (const [key, prompt] of Object.entries(businessPrompts)) {
    if (lowerType.includes(key)) {
      return prompt;
    }
  }

  // If user provided specific prompt, enhance it
  if (userPrompt && userPrompt.length > 10) {
    return `${userPrompt}, professional photography, photorealistic, high quality, 8k, commercial photography, perfect lighting`;
  }

  return businessPrompts.business;
}

// GET endpoint to check API status
export async function GET() {
  const hasKey = !!process.env.REPLICATE_API_KEY;
  return NextResponse.json({ 
    configured: hasKey,
    message: hasKey ? "Replicate API is configured" : "Add REPLICATE_API_KEY to .env.local"
  });
}
