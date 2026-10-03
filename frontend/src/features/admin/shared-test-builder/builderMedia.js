export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function dataUrlFile(value, name) {
  const [header, encoded] = value.split(',');
  const mime = header.match(/^data:([^;]+)/)?.[1];
  if (!mime || !header.includes(';base64')) throw new Error('Invalid local media file. Select the file again.');
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  return new File([bytes], name, { type: mime });
}

export async function uploadPendingMedia(test, { cover, audio } = {}) {
  const prepared = structuredClone(test);
  if (cover && prepared.details.pictureUrl?.startsWith('data:image/')) {
    const saved = await cover(dataUrlFile(prepared.details.pictureUrl, 'test-cover.jpg'));
    prepared.details.pictureUrl = saved.url;
  }
  const uploadAudio = async value => {
    if (typeof value === 'string' && value.startsWith('data:audio/') && audio) {
      const saved = await audio(dataUrlFile(value, 'draft-audio'));
      return saved.url;
    }
    if (Array.isArray(value)) {
      const result = [];
      for (const item of value) result.push(await uploadAudio(item));
      return result;
    }
    if (value && typeof value === 'object') {
      // Sequential uploads avoid flooding the media endpoint for a full Listening test.
      const result = {};
      for (const [key, item] of Object.entries(value)) result[key] = await uploadAudio(item);
      return result;
    }
    return value;
  };
  if (audio) prepared.parts = await uploadAudio(prepared.parts);
  return prepared;
}
