import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const claude = {
  async chatStream(messages: Array<any>, systemPrompt: string = "You are a helpful drone inspection AI.") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is missing");
    }

    const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });

    return stream;
  },

  async analyzeImage(imageBuffer: Buffer, prompt: string) {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: prompt
            }
          ],
        }
      ],
    });

    return response;
  }
};
