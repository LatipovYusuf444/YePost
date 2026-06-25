import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Boxes,
  Edit3,
  Eye,
  Layers3,
  LoaderCircle,
  PackagePlus,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useMahsulotlarStore } from "@/store/mahsulotlarStore";
import type {
  Kategoriya,
  Mahsulot,
  MahsulotModifikatsiyasi,
  OlchovBirligi,
} from "@/types/catalog";

type Tab = "mahsulotlar" | "kategoriyalar" | "birliklar";

export default function Mahsulotlar() {
  const store = useMahsulotlarStore();
  const yuklash = store.yuklash;
  const [tab, setTab] = useState<Tab>("mahsulotlar");
  const [qidiruv, setQidiruv] = useState("");
  const [mahsulotModal, setMahsulotModal] = useState<Mahsulot | "new" | null>(null);
  const [oddiyModal, setOddiyModal] = useState<Kategoriya | OlchovBirligi | "new" | null>(null);
  const [modProduct, setModProduct] = useState<Mahsulot | null>(null);

  useEffect(() => { void yuklash(); }, [yuklash]);

  const mahsulotlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    return q
      ? store.mahsulotlar.filter((item) =>
          [item.name, item.barcode, item.article].join(" ").toLowerCase().includes(q)
        )
      : store.mahsulotlar;
  }, [qidiruv, store.mahsulotlar]);

  async function oddiyOchirish(id: string) {
    if (!window.confirm("Ushbu ma'lumotni o'chirasizmi?")) return;
    if (tab === "kategoriyalar") await store.kategoriyaOchirish(id);
    else await store.birlikOchirish(id);
  }

  async function oddiyTahrirlash(item: Kategoriya | OlchovBirligi) {
    const toliq =
      tab === "kategoriyalar"
        ? await store.kategoriyaOlish(item.id)
        : await store.birlikOlish(item.id);
    if (toliq) setOddiyModal(toliq);
  }

  async function mahsulotTahrirlash(item: Mahsulot) {
    const toliq = await store.mahsulotOlish(item.id);
    if (toliq) setMahsulotModal(toliq);
  }

  async function mahsulotOchirish(id: string) {
    if (!window.confirm("Mahsulotni o'chirasizmi?")) return;
    await store.mahsulotOchirish(id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">Mahsulot katalogi</p>
          <h1 className="mt-1 text-3xl font-black">Katalog boshqaruvi</h1>
          <p className="mt-1 text-sm text-gray-500">Kategoriya, birlik, mahsulot, modifikatsiya va narxlar real backendda saqlanadi.</p>
        </div>
        <button onClick={() => void yuklash()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600">
          <RefreshCw size={17}/>Yangilash
        </button>
      </header>

      {store.xatolik && <div className="flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-600"><span>{store.xatolik}</span><button onClick={store.xatolikniTozalash}>Yopish</button></div>}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2">
        {[
          ["mahsulotlar","Mahsulotlar",Boxes],
          ["kategoriyalar","Kategoriyalar",Layers3],
          ["birliklar","O'lchov birliklari",Ruler],
        ].map(([id,nom,Icon]) => {
          const IconComponent = Icon as typeof Boxes;
          return <button key={String(id)} onClick={()=>setTab(id as Tab)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 font-bold ${tab===id?"bg-orange-500 text-white":"text-gray-500 hover:bg-orange-50"}`}><IconComponent size={17}/>{String(nom)}</button>;
        })}
      </nav>

      {store.yuklanmoqda ? <div className="flex h-72 items-center justify-center"><LoaderCircle className="animate-spin text-orange-500" size={34}/></div> : tab === "mahsulotlar" ? (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <label className="flex h-11 max-w-xl flex-1 items-center gap-2 rounded-2xl border bg-white px-4"><Search size={17} className="text-gray-400"/><input value={qidiruv} onChange={e=>setQidiruv(e.target.value)} className="min-w-0 flex-1 outline-none" placeholder="Mahsulot, shtrix-kod yoki artikul..."/></label>
            <button disabled={store.kategoriyalar.length===0||store.birliklar.length===0} onClick={()=>setMahsulotModal("new")} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50"><Plus size={17}/>Mahsulot qo'shish</button>
          </div>
          {(store.kategoriyalar.length===0||store.birliklar.length===0)&&<div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">Mahsulot yaratishdan oldin kamida bitta kategoriya va o'lchov birligi yarating.</div>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mahsulotlar.map(item=><article key={item.id} className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <div className="flex justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Boxes size={22}/></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isActive?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{item.isActive?"Faol":"Faol emas"}</span></div>
              <h2 className="mt-4 text-xl font-black">{item.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{item.category?.name??store.kategoriyalar.find(x=>x.id===item.categoryId)?.name??"Kategoriya"} · {item.unit?.shortName??item.unit?.name??store.birliklar.find(x=>x.id===item.unitId)?.shortName??"Birlik"}</p>
              <p className="mt-2 text-xs text-gray-400">Shtrix-kod: {item.barcode||"Kiritilmagan"} · Artikul: {item.article||"Kiritilmagan"}</p>
              <div className="mt-5 grid grid-cols-[1fr_1fr_42px] gap-2 border-t pt-4">
                <button onClick={()=>{setModProduct(item);void store.modifikatsiyalarniYuklash(item.id)}} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 py-2.5 text-sm font-bold text-slate-600"><Eye size={15}/>Variantlar</button>
                <button onClick={()=>void mahsulotTahrirlash(item)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-orange-50 py-2.5 text-sm font-bold text-orange-600"><Edit3 size={15}/>Tahrirlash</button>
                <button onClick={()=>void mahsulotOchirish(item.id)} className="flex items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={16}/></button>
              </div>
            </article>)}
            {mahsulotlar.length===0&&<Empty matn="Mahsulotlar mavjud emas"/>}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between"><div><h2 className="text-2xl font-black">{tab==="kategoriyalar"?"Kategoriyalar":"O'lchov birliklari"}</h2><p className="text-sm text-gray-500">Mahsulotlar uchun asosiy ma'lumotnoma.</p></div><button onClick={()=>setOddiyModal("new")} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"><Plus size={17}/>Qo'shish</button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(tab==="kategoriyalar"?store.kategoriyalar:store.birliklar).map(item=><article key={item.id} className="rounded-[24px] border border-orange-100 bg-white p-5">
              <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">{tab==="kategoriyalar"?<Tags size={21}/>:<Ruler size={21}/>}</div><div className="flex gap-2"><button onClick={()=>void oddiyTahrirlash(item)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Edit3 size={15}/></button><button onClick={()=>void oddiyOchirish(item.id)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={15}/></button></div></div>
              <h3 className="mt-4 text-lg font-black">{item.name}</h3>{"shortName" in item&&<p className="text-sm text-gray-400">Qisqa nomi: {String(item.shortName||"—")}</p>}
            </article>)}
            {(tab==="kategoriyalar"?store.kategoriyalar:store.birliklar).length===0&&<Empty matn="Ma'lumot mavjud emas"/>}
          </div>
        </section>
      )}

      {mahsulotModal&&<MahsulotModal item={mahsulotModal} onClose={()=>setMahsulotModal(null)}/>}
      {oddiyModal&&<OddiyModal tur={tab as "kategoriyalar"|"birliklar"} item={oddiyModal} onClose={()=>setOddiyModal(null)}/>}
      {modProduct&&<ModifikatsiyalarModal product={modProduct} onClose={()=>setModProduct(null)}/>}
    </div>
  );
}

function Empty({matn}:{matn:string}) {
  return <div className="col-span-full rounded-[24px] border border-dashed border-orange-200 p-12 text-center text-gray-400">{matn}</div>;
}

function MahsulotModal({item,onClose}:{item:Mahsulot|"new";onClose:()=>void}) {
  const store=useMahsulotlarStore();
  const editing=item!=="new";
  const [name,setName]=useState(editing?item.name:"");
  const [categoryId,setCategoryId]=useState(editing?item.categoryId:store.kategoriyalar[0]?.id??"");
  const [unitId,setUnitId]=useState(editing?item.unitId:store.birliklar[0]?.id??"");
  const [barcode,setBarcode]=useState(editing?item.barcode??"":"");
  const [article,setArticle]=useState(editing?item.article??"":"");
  const [imageUrl,setImageUrl]=useState(editing?item.imageUrl??"":"");
  const [isActive,setIsActive]=useState(editing?item.isActive:true);
  const [costPrice,setCostPrice]=useState("");
  const [retailPrice,setRetailPrice]=useState("");
  async function save(e:FormEvent){
    e.preventDefault();
    if(!name.trim()||!categoryId||!unitId||(!editing&&!barcode.trim()))return;
    const data={name:name.trim(),categoryId,unitId,barcode:barcode.trim()||undefined,article:article.trim()||undefined,imageUrl:imageUrl.trim()||undefined,isActive};
    const ok=editing
      ?await store.mahsulotSaqlash(item.id,data)
      :await store.mahsulotNarxBilanYaratish(data,{
          name:"Asosiy variant",
          barcode:barcode.trim(),
          article:article.trim()||undefined,
          price:{
            costPrice:Number(costPrice),
            retailPrice:Number(retailPrice),
            wholesalePrice:Number(retailPrice),
          },
        });
    if(ok)onClose()
  }
  return <Modal title={editing?"Mahsulotni tahrirlash":"Yangi mahsulot"} onClose={onClose}><form onSubmit={save} className="space-y-4">
    {store.xatolik&&<ErrorBox/>}<input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="Mahsulot nomi *"/>
    <div className="grid gap-4 sm:grid-cols-2"><select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="input"><option value="">Kategoriya *</option>{store.kategoriyalar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={unitId} onChange={e=>setUnitId(e.target.value)} className="input"><option value="">O'lchov birligi *</option>{store.birliklar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input" placeholder={`Shtrix-kod${editing?"":" *"}`}/><input value={article} onChange={e=>setArticle(e.target.value)} className="input" placeholder="Artikul"/></div>
    {!editing&&<div className="rounded-[22px] border border-orange-100 bg-orange-50/60 p-4">
      <div className="mb-4"><p className="font-black text-orange-800">Boshlang'ich narxlar</p><p className="mt-1 text-xs text-orange-700/70">Mahsulot bilan birga “Asosiy variant” va uning narxlari yaratiladi.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-gray-700">Kelish (tan) narxi
          <div className="relative mt-2"><input type="number" min="0" step="0.01" value={costPrice} onChange={e=>setCostPrice(e.target.value)} className="input pr-16" placeholder="Kelish narxini kiriting"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">so'm</span></div>
        </label>
        <label className="text-sm font-bold text-gray-700">Sotuv narxi
          <div className="relative mt-2"><input type="number" min="0" step="0.01" value={retailPrice} onChange={e=>setRetailPrice(e.target.value)} className="input pr-16" placeholder="Sotuv narxini kiriting"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">so'm</span></div>
        </label>
      </div>
      {retailPrice!==""&&costPrice!==""&&Number(costPrice)>Number(retailPrice)&&<p className="mt-3 text-sm font-bold text-amber-700">Sotuv narxi kelish narxidan past kiritilgan.</p>}
    </div>}
    <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="input" placeholder="Rasm manzili (URL)"/>
    <label className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4 font-bold"><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="h-5 w-5 accent-orange-500"/>Mahsulot faol</label>
    <Actions loading={store.amalBajarilmoqda} onClose={onClose}/>
  </form></Modal>
}

function OddiyModal({tur,item,onClose}:{tur:"kategoriyalar"|"birliklar";item:Kategoriya|OlchovBirligi|"new";onClose:()=>void}) {
  const store=useMahsulotlarStore();const editing=item!=="new";const [name,setName]=useState(editing?item.name:"");const [shortName,setShortName]=useState(editing&&"shortName" in item?item.shortName??"":"");
  async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;const ok=tur==="kategoriyalar"?await store.kategoriyaSaqlash(editing?item.id:null,{name:name.trim()}):await store.birlikSaqlash(editing?item.id:null,{name:name.trim(),shortName:shortName.trim()||undefined});if(ok)onClose()}
  return <Modal title={`${editing?"Tahrirlash":"Yangi"} ${tur==="kategoriyalar"?"kategoriya":"o'lchov birligi"}`} onClose={onClose}><form onSubmit={save} className="space-y-4">{store.xatolik&&<ErrorBox/>}<input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="Nomi *"/>{tur==="birliklar"&&<input value={shortName} onChange={e=>setShortName(e.target.value)} className="input" placeholder="Qisqa nomi, masalan: kg"/>}<Actions loading={store.amalBajarilmoqda} onClose={onClose}/></form></Modal>
}

function ModifikatsiyalarModal({product,onClose}:{product:Mahsulot;onClose:()=>void}) {
  const store=useMahsulotlarStore();const items=store.modifikatsiyalar[product.id]??[];const [editing,setEditing]=useState<MahsulotModifikatsiyasi|"new"|null>(null);
  async function remove(id:string){if(window.confirm("Variantni o'chirasizmi?"))await store.modifikatsiyaOchirish(product.id,id)}
  async function edit(item:MahsulotModifikatsiyasi){const [toliq,narx]=await Promise.all([store.modifikatsiyaOlish(item.id),store.narxOlish(item.id)]);if(toliq)setEditing({...toliq,price:narx??toliq.price})}
  return <Modal wide title={`${product.name} — variantlar va narxlar`} onClose={onClose}>
    <div className="flex justify-end"><button onClick={()=>setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black text-white"><PackagePlus size={16}/>Variant qo'shish</button></div>
    <div className="mt-4 space-y-3">{items.map(item=><div key={item.id} className="rounded-2xl border border-orange-100 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><h3 className="font-black">{item.name||"Asosiy variant"}</h3><p className="text-sm text-gray-500">Shtrix-kod: {item.barcode} · Artikul: {item.article||"—"}</p><p className="mt-2 text-sm font-bold text-orange-600">Tan narx: {money(item.price?.costPrice)} · Chakana: {money(item.price?.retailPrice)} · Ulgurji: {money(item.price?.wholesalePrice)}</p></div><div className="flex gap-2"><button onClick={()=>void edit(item)} className="rounded-xl bg-orange-50 px-3 py-2 font-bold text-orange-600">Tahrirlash</button><button onClick={()=>void remove(item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-red-500"><Trash2 size={16}/></button></div></div></div>)}{items.length===0&&<Empty matn="Variantlar mavjud emas"/>}</div>
    {editing&&<ModForm productId={product.id} item={editing} onClose={()=>setEditing(null)}/>}
  </Modal>
}

function ModForm({productId,item,onClose}:{productId:string;item:MahsulotModifikatsiyasi|"new";onClose:()=>void}) {
  const store=useMahsulotlarStore();const editing=item!=="new";const [name,setName]=useState(editing?item.name??"":"");const [barcode,setBarcode]=useState(editing?item.barcode:"");const [article,setArticle]=useState(editing?item.article??"":"");const [params,setParams]=useState(editing&&item.params?JSON.stringify(item.params):"");const [cost,setCost]=useState(Number(editing?item.price?.costPrice??0:0));const [retail,setRetail]=useState(Number(editing?item.price?.retailPrice??0:0));const [wholesale,setWholesale]=useState(Number(editing?item.price?.wholesalePrice??0:0));const [jsonError,setJsonError]=useState("");
  async function save(e:FormEvent){e.preventDefault();if(!barcode.trim())return;let parsed:Record<string,unknown>|undefined;try{parsed=params.trim()?JSON.parse(params):undefined;setJsonError("")}catch{setJsonError("Parametrlar JSON formati noto'g'ri.");return}const ok=await store.modifikatsiyaSaqlash(productId,editing?item.id:null,{name:name.trim()||undefined,barcode:barcode.trim(),article:article.trim()||undefined,params:parsed,price:{costPrice:cost,retailPrice:retail,wholesalePrice:wholesale}});if(ok&&editing)await store.narxYangilash(productId,item.id,{costPrice:cost,retailPrice:retail,wholesalePrice:wholesale});if(ok)onClose()}
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"><form onSubmit={save} className="w-full max-w-2xl rounded-[28px] bg-white p-6"><div className="flex justify-between"><h2 className="text-2xl font-black">{editing?"Variantni tahrirlash":"Yangi variant"}</h2><button type="button" onClick={onClose}><X/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="Variant nomi"/><input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input" placeholder="Shtrix-kod *"/><input value={article} onChange={e=>setArticle(e.target.value)} className="input" placeholder="Artikul"/><input value={params} onChange={e=>setParams(e.target.value)} className="input" placeholder='Parametrlar JSON: {"rang":"qizil"}'/><input type="number" min="0" value={cost} onChange={e=>setCost(Number(e.target.value))} className="input" placeholder="Tan narx"/><input type="number" min="0" value={retail} onChange={e=>setRetail(Number(e.target.value))} className="input" placeholder="Chakana narx"/><input type="number" min="0" value={wholesale} onChange={e=>setWholesale(Number(e.target.value))} className="input" placeholder="Ulgurji narx"/></div>{jsonError&&<p className="mt-3 text-sm font-bold text-red-500">{jsonError}</p>}<Actions loading={store.amalBajarilmoqda} onClose={onClose}/></form></div>
}

function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"><div className={`max-h-[94vh] w-full overflow-y-auto rounded-[30px] bg-white p-6 ${wide?"max-w-5xl":"max-w-xl"}`}><div className="mb-5 flex justify-between gap-4"><h2 className="text-2xl font-black">{title}</h2><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><X size={18}/></button></div>{children}</div></div>}
function Actions({loading,onClose}:{loading:boolean;onClose:()=>void}){return <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Bekor qilish</button><button disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{loading&&<LoaderCircle size={16} className="animate-spin"/>}Saqlash</button></div>}
function ErrorBox(){const x=useMahsulotlarStore(s=>s.xatolik);return <div className="rounded-xl bg-red-50 p-3 font-bold text-red-600">{x}</div>}
function money(value:number|string|undefined){return `${Number(value??0).toLocaleString("uz-UZ")} so'm`}
