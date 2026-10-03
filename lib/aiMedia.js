const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { spawn } = require('child_process');

async function generateImage(openai, prompt) {
    if (!openai) throw new Error('OPENAI_API_KEY no está configurada.');
    const result = await openai.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
        prompt: String(prompt).trim(),
        size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
        quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
        output_format: 'png'
    });
    const item = result.data?.[0];
    if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
    if (item?.url) return Buffer.from((await axios.get(item.url, { responseType: 'arraybuffer', timeout: 30000 })).data);
    throw new Error('El proveedor no devolvió una imagen.');
}

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `ffmpeg terminó con código ${code}`)));
    });
}

async function imageToShortVideo(imageBuffer) {
    const id = crypto.randomBytes(8).toString('hex');
    const input = path.join(os.tmpdir(), `jkbot-ai-${id}.png`);
    const output = path.join(os.tmpdir(), `jkbot-ai-${id}.mp4`);
    await fs.writeFile(input, imageBuffer);
    try {
        await run('ffmpeg', [
            '-y', '-loop', '1', '-i', input,
            '-vf', "scale=1280:1280:force_original_aspect_ratio=decrease,pad=1280:1280:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0008,1.08)':d=150:s=720x720:fps=30,format=yuv420p",
            '-t', '5', '-an', '-movflags', '+faststart', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', output
        ]);
        return await fs.readFile(output);
    } finally {
        await fs.remove(input).catch(() => {});
        await fs.remove(output).catch(() => {});
    }
}

module.exports = { generateImage, imageToShortVideo };
