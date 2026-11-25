import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sky, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Materiallar } from "./materiallar";
import type { ShaharMateriallari } from "./shaharMateriallari";
import { DERAZA_KATAKLARI, derazaNiqobi, yoritishParametrlari, type DerazaFasadi, type VaqtRejimi, type YoritishParametrlari } from "./kunTun";

// Kun / tun yoritishi: osmon, tuman, muhit aksi, yarim shar va soya beruvchi yagona yorug'lik (kunduzi quyosh, tunda oy),
// tunda yulduzlar, yoniq derazalar, fonarlar va asosiy joylardagi bir nechta nuqtali chiroq.
// "avto" — Toshkent quyoshi har 10 soniyada qayta hisoblanadi; rejim almashganda qiymatlar ~1.5 soniyada silliq o'tadi.

type Props = { m: Materiallar; sm: ShaharMateriallari; rejim: VaqtRejimi; soyaNishoni: THREE.Object3D };

/** Soya kamerasi markazidan yorug'lik manbaigacha masofa (m). */
const MASOFA = 90;
/** Qiymatlar maqsadga yaqinlashish vaqt doimiysi (s): ~3τ ≈ 1.5 s da 95%. */
const TAU = 0.5;
/** "avto" rejimda quyoshni qayta hisoblash oralig'i (ms). */
const QAYTA_HISOB = 10_000;

/** Tunda nuqtali chiroqlar: KPP navisi, jo'natish rampalari (1, 2), qabul rampalari (3, 4), ofis kirishi. */
const TUNGI_CHIROQLAR: { joy: [number, number, number]; rang: string; kuch: number; masofa: number }[] = [
  { joy: [0, 5, 43], rang: "#ffe2b0", kuch: 70, masofa: 26 },
  { joy: [88, 5.5, 17], rang: "#fff1d6", kuch: 80, masofa: 28 },
  { joy: [106, 5.5, 17], rang: "#fff1d6", kuch: 80, masofa: 28 },
  { joy: [-35, 5, 0], rang: "#fff1d6", kuch: 70, masofa: 26 },
  { joy: [-48, 4, 45], rang: "#ffd9a0", kuch: 60, masofa: 22 },
];

/** Tunda yorqinroq yonadigan materiallar: kunduzgi (asl) qiymatdan tungi qiymatga. */
const TUNGI_NUR: { kalit: string; manba: "m" | "sm"; tun: number }[] = [
  { kalit: "derazaYorugi", manba: "m", tun: 1.7 },
  { kalit: "ekran", manba: "m", tun: 0.95 },
  { kalit: "planshet", manba: "m", tun: 0.9 },
  { kalit: "mayoq", manba: "m", tun: 3.2 },
  { kalit: "chiroqBosh", manba: "sm", tun: 3.4 },
  { kalit: "ledPanel", manba: "sm", tun: 2.6 },
  { kalit: "reklama", manba: "sm", tun: 1.4 },
  { kalit: "svetoforYashil", manba: "sm", tun: 2.4 },
  { kalit: "oldChiroq", manba: "sm", tun: 2.6 },
  { kalit: "orqaChiroq", manba: "sm", tun: 2 },
];
/** Tungi shahar fasadlari derazalarining yorqinligi. */
const FASAD_NURI = 0.95;

/** Osmon shaderiga tungi gradient (zenit → ufq) qo'shiladi: quyosh ufq ostida bo'lganda shader qop-qora bo'lib qolmasin. */
const OSMON_YAMOGI = "kunTunYamogi";
function osmonniYamash(material: THREE.ShaderMaterial) {
  if (!material.userData[OSMON_YAMOGI]) {
    const yakun = "gl_FragColor = vec4( retColor, 1.0 );";
    if (!material.fragmentShader.includes(yakun)) return false;
    material.fragmentShader = material.fragmentShader
      .replace(/void main\(\)\s*\{/, "uniform vec3 tunZenit;\nuniform vec3 tunUfq;\nuniform float kunAralash;\nvoid main() {")
      .replace(yakun, "vec3 tunOsmon = mix( tunUfq, tunZenit, clamp( direction.y * 2.5, 0.0, 1.0 ) );\ngl_FragColor = vec4( mix( tunOsmon, retColor, kunAralash ), 1.0 );");
    material.userData[OSMON_YAMOGI] = true;
    material.needsUpdate = true;
  }
  // three-stdlib Sky materiali barcha nusxalar uchun bitta — uniformlar bir marta qo'shiladi.
  material.uniforms.tunZenit ??= { value: new THREE.Color("#040a1a") };
  material.uniforms.tunUfq ??= { value: new THREE.Color("#0d1526") };
  material.uniforms.kunAralash ??= { value: 1 };
  return true;
}

/** Yulduzlar: yorqinlik uniformi (silliq paydo bo'lish) va faqat ufqdan yuqoridagi yulduzlar. */
function yulduzlarniYamash(material: THREE.ShaderMaterial) {
  const yakun = "gl_FragColor = vec4(vColor, opacity);";
  if (!material.fragmentShader.includes(yakun)) return false;
  material.fragmentShader = `uniform float yulduzKuchi;\n${material.fragmentShader.replace(yakun, "gl_FragColor = vec4(vColor * yulduzKuchi, opacity);")}`;
  material.vertexShader = material.vertexShader.replace("vColor = color;", "vColor = color * step( 20.0, position.y );");
  material.uniforms.yulduzKuchi = { value: 0 };
  material.needsUpdate = true;
  return true;
}

/** Muhit aksi (Lightformer'lar, bir marta chiziladi). Qayta chizilmasin — kuchi useFrame da scene.environmentIntensity orqali. */
const MuhitAksi = memo(function MuhitAksi() {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={0.6}>
      <Lightformer form="rect" intensity={2.2} position={[0, 40, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[120, 120, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={0.9} position={[-50, 12, 0]} rotation={[0, Math.PI / 2, 0]} scale={[100, 24, 1]} color="#c7dbff" />
      <Lightformer form="rect" intensity={0.7} position={[50, 10, 20]} rotation={[0, -Math.PI / 2, 0]} scale={[100, 24, 1]} color="#ffe6c7" />
      <Lightformer form="rect" intensity={0.35} position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[150, 150, 1]} color="#8a9873" />
    </Environment>
  );
});

/** Joriy (silliq o'zgaruvchi) yoritish holati — bir marta yaratiladi, har kadrda maqsadga yaqinlashadi. */
function joriyHolat() {
  return {
    asosiyYon: new THREE.Vector3(0.4, 0.8, 0.3),
    asosiyRang: new THREE.Color(),
    asosiyKuch: 0,
    toldYon: new THREE.Vector3(),
    toldRang: new THREE.Color(),
    toldKuch: 0,
    osmonQuyosh: new THREE.Vector3(),
    tunZenit: new THREE.Color(),
    tunUfq: new THREE.Color(),
    kunAralash: 1,
    turbidity: 4.5,
    rayleigh: 1.2,
    mie: 0.004,
    mieG: 0.8,
    yarimOsmon: new THREE.Color(),
    yarimYer: new THREE.Color(),
    yarimKuch: 0.55,
    tumanRang: new THREE.Color(),
    tumanYaqin: 220,
    tumanUzoq: 720,
    muhit: 0.6,
    yulduz: 0,
    chiroq: 0,
    vaqtRang: new THREE.Color(),
    vaqtVek: new THREE.Vector3(),
  };
}

const TUMAN_BOSHI: [string, number, number] = ["#d4dfe9", 220, 720];
const OSMON_BOSHI: [number, number, number] = [0.4, 0.8, 0.3];

export default function KunTunYoritish({ m, sm, rejim, soyaNishoni }: Props) {
  const asosiy = useRef<THREE.DirectionalLight>(null);
  const toldiruvchi = useRef<THREE.DirectionalLight>(null);
  const yarimShar = useRef<THREE.HemisphereLight>(null);
  const tuman = useRef<THREE.Fog>(null);
  const osmon = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>>(null);
  const yulduzlar = useRef<THREE.Points>(null);
  const chiroqlar = useRef<(THREE.PointLight | null)[]>([]);
  const holat = useMemo(joriyHolat, []);
  /** Maqsad parametrlari, oxirgi hisob vaqti va rejim (rejim almashsa — darhol qayta hisob). */
  const maqsad = useRef<{ p: YoritishParametrlari | null; vaqt: number; rejim: VaqtRejimi | null; boshlandi: boolean; yulduzYamoq: boolean }>({ p: null, vaqt: 0, rejim: null, boshlandi: false, yulduzYamoq: false });

  // Tungi nur: asl emissiveIntensity saqlanadi, sahifadan chiqilganda tiklanadi.
  const nurlar = useMemo(() => {
    const manbalar = { m: m as unknown as Record<string, unknown>, sm: sm as unknown as Record<string, unknown> };
    return TUNGI_NUR.flatMap(({ kalit, manba, tun }) => {
      const mat = manbalar[manba][kalit];
      return mat instanceof THREE.MeshStandardMaterial ? [{ mat, asl: mat.emissiveIntensity, tun }] : [];
    });
  }, [m, sm]);

  // Shahar fasadlari: tunda faqat derazalar yonadi (fasad teksturasidan yasalgan niqob emissiveMap sifatida).
  const fasadlar = useMemo(() => {
    if (typeof document === "undefined") return [];
    const royxat: { mat: THREE.MeshStandardMaterial; niqob: THREE.CanvasTexture; asl: { map: THREE.Texture | null; rang: THREE.Color; kuch: number } }[] = [];
    for (const tur of Object.keys(DERAZA_KATAKLARI) as DerazaFasadi[]) {
      const mat = sm.fasad[tur];
      const rasm = mat?.map?.image as unknown;
      if (!mat || !mat.map || !(rasm instanceof HTMLCanvasElement)) continue;
      const ctx = rasm.getContext("2d");
      if (!ctx) continue;
      const { width: eni, height: boyi } = rasm;
      const canvas = document.createElement("canvas");
      canvas.width = eni;
      canvas.height = boyi;
      const ctx2 = canvas.getContext("2d");
      if (!ctx2) continue;
      const tasvir = ctx2.createImageData(eni, boyi);
      tasvir.data.set(derazaNiqobi(ctx.getImageData(0, 0, eni, boyi).data, eni, boyi, tur));
      ctx2.putImageData(tasvir, 0, 0);
      const niqob = new THREE.CanvasTexture(canvas);
      niqob.colorSpace = THREE.SRGBColorSpace;
      niqob.wrapS = mat.map.wrapS;
      niqob.wrapT = mat.map.wrapT;
      niqob.repeat.copy(mat.map.repeat);
      niqob.anisotropy = 4;
      royxat.push({ mat, niqob, asl: { map: mat.emissiveMap, rang: mat.emissive.clone(), kuch: mat.emissiveIntensity } });
    }
    return royxat;
  }, [sm]);

  useEffect(() => {
    for (const f of fasadlar) {
      f.mat.emissiveMap = f.niqob;
      f.mat.emissive.set("#ffffff");
      f.mat.emissiveIntensity = 0;
      f.mat.needsUpdate = true;
    }
    return () => {
      for (const f of fasadlar) {
        f.mat.emissiveMap = f.asl.map;
        f.mat.emissive.copy(f.asl.rang);
        f.mat.emissiveIntensity = f.asl.kuch;
        f.mat.needsUpdate = true;
        f.niqob.dispose();
      }
    };
  }, [fasadlar]);

  useEffect(() => () => {
    for (const n of nurlar) n.mat.emissiveIntensity = n.asl;
  }, [nurlar]);

  // Osmon shaderini birinchi kadrdan oldin yamash (bitta umumiy material — qayta yamalmaydi).
  useLayoutEffect(() => {
    const mat = osmon.current?.material;
    if (!(mat instanceof THREE.ShaderMaterial) || !osmonniYamash(mat)) return;
    return () => {
      mat.uniforms.kunAralash.value = 1;
    };
  }, []);

  useLayoutEffect(() => {
    const mat = yulduzlar.current?.material;
    maqsad.current.yulduzYamoq = mat instanceof THREE.ShaderMaterial && yulduzlarniYamash(mat);
  }, []);

  useFrame((state, dtXom) => {
    const hozir = Date.now();
    const q = maqsad.current;
    if (!q.p || q.rejim !== rejim || (rejim === "avto" && hozir - q.vaqt > QAYTA_HISOB)) {
      q.p = yoritishParametrlari(rejim === "avto" ? hozir : rejim);
      q.vaqt = hozir;
      q.rejim = rejim;
    }
    const p = q.p;
    // Birinchi kadrda darhol, keyin silliq (kadr tezligiga bog'liq emas).
    const k = q.boshlandi ? 1 - Math.exp(-Math.min(dtXom, 0.1) / TAU) : 1;
    q.boshlandi = true;
    const h = holat;
    const son = (a: number, b: number) => a + (b - a) * k;
    const rang = (c: THREE.Color, hex: string) => c.lerp(h.vaqtRang.set(hex), k);
    const yon = (v: THREE.Vector3, [x, y, z]: readonly number[]) => v.lerp(h.vaqtVek.set(x, y, z), k).normalize();

    yon(h.asosiyYon, p.asosiy.yonalish);
    rang(h.asosiyRang, p.asosiy.rang);
    h.asosiyKuch = son(h.asosiyKuch, p.asosiy.kuch);
    yon(h.toldYon, p.toldiruvchi.yonalish);
    rang(h.toldRang, p.toldiruvchi.rang);
    h.toldKuch = son(h.toldKuch, p.toldiruvchi.kuch);
    yon(h.osmonQuyosh, p.osmon.quyosh);
    rang(h.tunZenit, p.osmon.tunZenit);
    rang(h.tunUfq, p.osmon.tunUfq);
    h.kunAralash = son(h.kunAralash, p.osmon.kunAralash);
    h.turbidity = son(h.turbidity, p.osmon.turbidity);
    h.rayleigh = son(h.rayleigh, p.osmon.rayleigh);
    h.mie = son(h.mie, p.osmon.mieCoefficient);
    h.mieG = son(h.mieG, p.osmon.mieDirectionalG);
    rang(h.yarimOsmon, p.yarimShar.osmon);
    rang(h.yarimYer, p.yarimShar.yer);
    h.yarimKuch = son(h.yarimKuch, p.yarimShar.kuch);
    rang(h.tumanRang, p.tuman.rang);
    h.tumanYaqin = son(h.tumanYaqin, p.tuman.yaqin);
    h.tumanUzoq = son(h.tumanUzoq, p.tuman.uzoq);
    h.muhit = son(h.muhit, p.muhitKuchi);
    h.yulduz = son(h.yulduz, p.yulduzlar);
    h.chiroq = son(h.chiroq, p.chiroqlar);

    const nur = asosiy.current;
    if (nur) {
      nur.position.copy(soyaNishoni.position).addScaledVector(h.asosiyYon, MASOFA);
      nur.color.copy(h.asosiyRang);
      nur.intensity = h.asosiyKuch;
    }
    const told = toldiruvchi.current;
    if (told) {
      told.position.copy(h.toldYon).multiplyScalar(40);
      told.color.copy(h.toldRang);
      told.intensity = h.toldKuch;
    }
    const yarim = yarimShar.current;
    if (yarim) {
      yarim.color.copy(h.yarimOsmon);
      yarim.groundColor.copy(h.yarimYer);
      yarim.intensity = h.yarimKuch;
    }
    const fog = tuman.current;
    if (fog) {
      fog.color.copy(h.tumanRang);
      fog.near = h.tumanYaqin;
      fog.far = h.tumanUzoq;
    }
    state.scene.environmentIntensity = h.muhit;

    const osmonMat = osmon.current?.material;
    if (osmonMat instanceof THREE.ShaderMaterial) {
      const u = osmonMat.uniforms;
      u.sunPosition.value.copy(h.osmonQuyosh);
      u.turbidity.value = h.turbidity;
      u.rayleigh.value = h.rayleigh;
      u.mieCoefficient.value = h.mie;
      u.mieDirectionalG.value = h.mieG;
      if (u.kunAralash) {
        u.kunAralash.value = h.kunAralash;
        u.tunZenit.value.copy(h.tunZenit);
        u.tunUfq.value.copy(h.tunUfq);
      }
    }

    const yulduz = yulduzlar.current;
    if (yulduz) {
      const mat = yulduz.material;
      if (q.yulduzYamoq && mat instanceof THREE.ShaderMaterial) {
        mat.uniforms.yulduzKuchi.value = h.yulduz;
        yulduz.visible = h.yulduz > 0.01;
      } else {
        yulduz.visible = h.yulduz > 0.5;
      }
    }

    for (const n of nurlar) {
      const qiymat = n.asl + (n.tun - n.asl) * h.chiroq;
      if (Math.abs(n.mat.emissiveIntensity - qiymat) > 1e-3) n.mat.emissiveIntensity = qiymat;
    }
    for (const f of fasadlar) {
      const qiymat = FASAD_NURI * h.chiroq;
      if (Math.abs(f.mat.emissiveIntensity - qiymat) > 1e-3) f.mat.emissiveIntensity = qiymat;
    }
    chiroqlar.current.forEach((chiroq, i) => {
      if (chiroq) chiroq.intensity = TUNGI_CHIROQLAR[i].kuch * h.chiroq;
    });
  });

  return (
    <>
      {/* Osmon (shader, tashqi rasm yo'q): quyosh nuqtasi, Preetham parametrlari va tungi gradient useFrame da yangilanadi */}
      <Sky ref={osmon} distance={1800} sunPosition={OSMON_BOSHI} turbidity={4.5} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.8} />
      {/* Yulduzlar osmon qutisi (±900) ichida, ufqdan yuqorida; tunda silliq paydo bo'ladi */}
      <Stars ref={yulduzlar} radius={700} depth={60} count={2500} factor={28} saturation={0} fade speed={0.6} />
      {/* Havo pardasi: uzoqdagi shaharcha ufqda eriydi (rangi osmon ufqi bilan bir xil) */}
      <fog ref={tuman} attach="fog" args={TUMAN_BOSHI} />
      <MuhitAksi />
      <hemisphereLight ref={yarimShar} args={["#e3edf8", "#6f7d5e", 0.55]} />
      <directionalLight
        ref={asosiy}
        target={soyaNishoni}
        intensity={0}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={72}
        shadow-camera-bottom={-72}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={toldiruvchi} intensity={0} />
      {/* Tungi nuqtali chiroqlar (soyasiz, kunduzi kuchi 0 — yorug'liklar soni o'zgarmaydi, shaderlar qayta yig'ilmaydi) */}
      {TUNGI_CHIROQLAR.map((c, i) => (
        <pointLight
          key={c.joy.join(",")}
          ref={(el) => {
            chiroqlar.current[i] = el;
          }}
          position={c.joy}
          color={c.rang}
          intensity={0}
          distance={c.masofa}
          decay={2}
        />
      ))}
    </>
  );
}
