import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GltfCharacter } from './GltfCharacter.js';
import { ProceduralFox } from './ProceduralFox.js';

export const DEFAULT_MODEL_URL = 'models/animal.glb';

/**
 * 嘗試載入 GLB 角色；檔案不存在或解析失敗時，退回內建的圓滾滾小狐狸。
 * 把模型放到 public/models/animal.glb 即可自動替換，或用網址參數 ?model=xxx.glb 指定。
 */
export async function loadCharacter(url = DEFAULT_MODEL_URL) {
  try {
    const res = await fetch(url);
    const type = res.headers.get('content-type') || '';
    // Vite 開發伺服器找不到檔案時會回傳 index.html（200），要排除
    if (!res.ok || type.includes('text/html')) throw new Error(`找不到 ${url}`);

    const buffer = await res.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buffer, url.replace(/[^/]*$/, ''));
    console.info(
      `[Cozy] 載入角色模型 ${url}，動畫：${gltf.animations.map((a) => a.name).join(', ') || '（無）'}`,
    );
    return new GltfCharacter(gltf);
  } catch (err) {
    console.info(`[Cozy] 使用內建小狐狸（${err.message}）`);
    return new ProceduralFox();
  }
}
