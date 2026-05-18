import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const IDENTITY_LOCK = `Use the uploaded pet photo as the primary visual reference. Preserve the pet's exact facial structure, breed characteristics, fur colors, markings, eye shape, ear shape, muzzle shape, body proportions, and recognizable expression. Do not genericize the animal. The final image must clearly look like the same pet transformed into this scene.`;

const NEGATIVE = `Do not change breed, fur markings, eye color, or body proportions. Do not make the pet generic or unrecognizable. Do not distort the face. Do not add extra limbs. Do not over-humanize. Do not remove recognizable traits. No creepy anatomy. No uncanny valley eyes. No warped paws. No duplicate heads.`;

const STYLE_PROMPTS: Record<string, { prompt: string; caption: string }> = {
  movie_poster: {
    prompt: `Transform into a dramatic cinematic movie poster. Epic high-contrast lighting, bold title treatment area at the top and bottom, heroic emotional pose, shallow depth of field, Hollywood blockbuster composition. The pet is the undisputed star. Aspect ratio 2:3. ${IDENTITY_LOCK}`,
    caption: `COMING SOON TO A SCREEN NEAR YOU`,
  },
  rap_album: {
    prompt: `Transform into a luxury rap album cover. Pet styled as a hip-hop icon with dramatic studio lighting, bold contrast, subtle gold and chrome tones, parental advisory layout. Confident swagger pose. Album cover square format. ${IDENTITY_LOCK}`,
    caption: `OUT NOW ON ALL PLATFORMS`,
  },
  motivational: {
    prompt: `Transform into an epic motivational poster. Heroic portrait with golden-hour sunrise/sunset lighting, cinematic depth of field, inspirational energy. Bold color grading. The pet radiates determination and unstoppable energy. ${IDENTITY_LOCK}`,
    caption: `BUILT DIFFERENT. FED TWICE.`,
  },
  anime_hero: {
    prompt: `Transform into an anime-inspired hero portrait. Dramatic action pose, glowing aura background, wind-swept effect, bold cel-shaded art style while keeping photorealistic pet features recognizable. Epic energy. ${IDENTITY_LOCK}`,
    caption: `EPISODE 1: THE AWAKENING`,
  },
  mafia_boss: {
    prompt: `Transform into a mafia boss parody portrait. Pet seated in a leather executive chair, dramatic side lighting creating deep shadows, subtle gold accents, serious composed expression, cinematic Italian crime film aesthetic. ${IDENTITY_LOCK}`,
    caption: `AN OFFER YOU CAN'T REFUSE`,
  },
  ceo_pet: {
    prompt: `Transform into a tech startup CEO portrait. Modern glass office or boardroom background, confident authoritative pose, clean professional lighting, subtle collar accessory, LinkedIn profile energy meets magazine cover. ${IDENTITY_LOCK}`,
    caption: `FOUNDER. VISIONARY. GOOD BOY.`,
  },
  gym_bro: {
    prompt: `Transform into a gym bro fitness photo. Athletic gym setting, dramatic pump-up lighting, mirror selfie or post-workout pose energy, protein shake nearby, motivational fitness aesthetic. ${IDENTITY_LOCK}`,
    caption: `NO DAYS OFF`,
  },
  disney_adventure: {
    prompt: `Transform into a Disney animated adventure scene. Lush magical environment, warm adventure lighting, expressive heroic pose, painterly storybook quality, sense of epic journey beginning. ${IDENTITY_LOCK}`,
    caption: `AN ADVENTURE BEGINS`,
  },
  fantasy_warrior: {
    prompt: `Transform into a fantasy warrior hero portrait. Epic armor or mystical robes, dramatic atmospheric battle background, glowing magical effects, heroic stance, dark fantasy oil painting aesthetic. ${IDENTITY_LOCK}`,
    caption: `CHOSEN BY DESTINY`,
  },
  luxury_influencer: {
    prompt: `Transform into a luxury lifestyle influencer photo. High-end backdrop (yacht, penthouse, private jet), soft golden hour lighting, aspirational composition, editorial magazine quality. ${IDENTITY_LOCK}`,
    caption: `LIVING THE LIFE`,
  },
  meme_reaction: {
    prompt: `Transform into a perfect meme reaction image. Expressive close-up, clean simple background, strong readable emotion (side-eye, shocked, smug, or dramatic stare), maximum emotional impact at small thumbnail size, internet-native framing with space for caption text above and below. ${IDENTITY_LOCK}`,
    caption: `WHEN THE TREAT BAG SOUNDS`,
  },
  sports_legend: {
    prompt: `Transform into a sports legend champion portrait. Stadium lighting, dramatic spotlight, championship pose, athletic glory, ESPN magazine cover composition. ${IDENTITY_LOCK}`,
    caption: `GREATEST OF ALL TIME`,
  },
  rescue_hero: {
    prompt: `Transform into a rescue hero portrait. Hero costume or gear, dramatic action lighting, protective heroic stance, dramatic sky background, cinematic superhero movie aesthetic. ${IDENTITY_LOCK}`,
    caption: `SAVING THE DAY`,
  },
  birthday_star: {
    prompt: `Transform into a birthday star celebration portrait. Festive confetti and balloon environment, warm celebration lighting, joyful energy, party hat optional, vibrant colors, shareable birthday card composition. ${IDENTITY_LOCK}`,
    caption: `IT'S MY DAY`,
  },
  memorial_tribute: {
    prompt: `Transform into an elegant memorial tribute portrait. Soft ethereal lighting, dreamy bokeh background, dignified peaceful expression, warm golden tones, timeless portrait quality that celebrates a life lived fully. ${IDENTITY_LOCK}`,
    caption: `FOREVER IN OUR HEARTS`,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, viralAngle, petProfile, userApiKey } = body as {
      image: string;
      viralAngle: string;
      petProfile: Record<string, unknown>;
      userApiKey?: string;
    };

    if (!image || !viralAngle) {
      return NextResponse.json({ error: 'image and viralAngle are required' }, { status: 400 });
    }

    const style = STYLE_PROMPTS[viralAngle];
    if (!style) {
      return NextResponse.json({ error: `Unknown viral angle: ${viralAngle}` }, { status: 400 });
    }

    // Resolve API key and endpoint: prefer user's ZenMux key, fall back to server OpenAI
    const resolvedKey = userApiKey?.trim() || process.env.OPENAI_API_KEY;
    const useZenMux = !!(userApiKey?.trim());
    const baseUrl = useZenMux
      ? 'https://zenmux.ai/v1/images/edits'
      : 'https://api.openai.com/v1/images/edits';

    if (!resolvedKey) {
      return NextResponse.json({ error: 'No API key available. Add OPENAI_API_KEY or provide a ZenMux key.' }, { status: 500 });
    }

    // Build identity-specific prompt additions from pet profile
    const identityDetails = petProfile
      ? [
          petProfile.breedEstimate && `Breed: ${petProfile.breedEstimate}.`,
          petProfile.furColors && `Fur: ${(petProfile.furColors as string[]).join(', ')}.`,
          petProfile.markings && `Markings: ${petProfile.markings}.`,
          petProfile.eyeColor && `Eyes: ${petProfile.eyeColor}.`,
          petProfile.mostRecognizableTraits &&
            `Key traits: ${(petProfile.mostRecognizableTraits as string[]).join(', ')}.`,
        ]
          .filter(Boolean)
          .join(' ')
      : '';

    const fullPrompt = `${style.prompt}${identityDetails ? ` Pet identity reference — ${identityDetails}` : ''} ${NEGATIVE}`;

    // Strip data URL prefix if present
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    let processedBuffer = inputBuffer;
    try {
      // 1. Resize and crop to 1024x1024, ensuring RGBA alpha channel
      const rawResized = await sharp(inputBuffer)
        .resize(1024, 1024, {
          fit: 'cover',
          position: 'center'
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = rawResized;
      const width = info.width;
      const height = info.height;

      if (useZenMux) {
        // For ZenMux: We keep the entire image opaque as it is a reference image,
        // but set the very last pixel transparent to satisfy any structural validation
        const lastPixelIdx = (width * height - 1) * 4;
        if (lastPixelIdx + 3 < data.length) {
          data[lastPixelIdx + 3] = 0;
        }
      } else {
        // For Standard OpenAI: Standard edit/inpainting requires visible transparent areas to edit.
        // We keep a centered circular area fully opaque (so the pet is perfectly preserved)
        // and smoothly fade the background/edges to transparent, letting DALL-E paint the new scene!
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(centerX, centerY);

        const opaqueRadius = maxRadius * 0.65; // Keep center 65% fully opaque
        const fadeWidth = maxRadius * 0.35;    // Fade the outer 35% smoothly

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > opaqueRadius) {
              if (distance >= maxRadius) {
                data[idx + 3] = 0; // Fully transparent at boundaries
              } else {
                // Smooth linear fade
                const factor = 1 - (distance - opaqueRadius) / fadeWidth;
                data[idx + 3] = Math.max(0, Math.min(255, Math.floor(factor * 255)));
              }
            }
          }
        }
      }

      // Convert the modified raw buffer back to standard PNG format
      processedBuffer = await sharp(data, {
        raw: {
          width,
          height,
          channels: info.channels as 4,
        }
      })
      .png()
      .toBuffer();
    } catch (err) {
      console.error('[viral-photo/generate] Image preprocessing failed, falling back to raw buffer:', err);
    }

    const blob = new Blob([processedBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('model', useZenMux ? 'openai/gpt-image-2' : 'dall-e-2');
    formData.append('prompt', fullPrompt);
    formData.append('image', blob, 'pet.png');
    formData.append('size', '1024x1024');

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${resolvedKey}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      // If ZenMux fails on image editing, surface a clear message
      const errMsg = data.error?.message || data.error || 'Image generation failed';
      return NextResponse.json({ error: errMsg, provider: useZenMux ? 'zenmux' : 'openai' }, { status: res.status });
    }

    const imageUrl = data.data?.[0]?.b64_json
      ? `data:image/png;base64,${data.data[0].b64_json}`
      : data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: 'API returned empty image data' }, { status: 500 });
    }

    return NextResponse.json({
      url: imageUrl,
      caption: style.caption,
      prompt: fullPrompt,
      provider: useZenMux ? 'zenmux' : 'openai',
      success: true,
    });
  } catch (error: unknown) {
    console.error('[viral-photo/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
