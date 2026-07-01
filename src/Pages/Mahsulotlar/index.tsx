import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import {
  Boxes,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  ImagePlus,
  Layers3,
  LayoutGrid,
  LoaderCircle,
  PackagePlus,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Table2,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useMahsulotlarStore } from "@/store/mahsulotlarStore";
import type {
  Kategoriya,
  Mahsulot,
  MahsulotModifikatsiyasi,
  OlchovBirligi,
} from "@/types/catalog";

type Tab = "mahsulotlar" | "kategoriyalar" | "birliklar";
type Korinish = "kartochka" | "jadval";
type VariationRow = {
  id: number;
  attribute: string;
  attributeAdded: boolean;
  value: string;
  options: string[];
};

type VariantCombination = {
  key: string;
  label: string;
  params: Record<string, string>;
};

type VariantDraft = {
  barcode: string;
  imageUrl: string;
  active: boolean;
  costPrice: string;
  costCurrency: "UZS" | "USD";
  markup: string;
  retailPrice: string;
  retailCurrency: "UZS" | "USD";
  wholesalePrice: string;
  wholesaleCurrency: "UZS" | "USD";
};

const korinishlar: Array<{ id: Korinish; nom: string; icon: typeof Boxes }> = [
  { id: "kartochka", nom: "Kartochka", icon: LayoutGrid },
  { id: "jadval", nom: "Jadval", icon: Table2 },
];

export default function Mahsulotlar() {
  const store = useMahsulotlarStore();
  const yuklash = store.yuklash;
  const [tab, setTab] = useState<Tab>("mahsulotlar");
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("kartochka");
  const [korinishMenu, setKorinishMenu] = useState(false);
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

  const tanlanganKorinish = korinishlar.find((item) => item.id === korinish) ?? korinishlar[0];
  const TanlanganIcon = tanlanganKorinish.icon;

  function kategoriyaNomi(item: Mahsulot) {
    return item.category?.name ?? store.kategoriyalar.find((x) => x.id === item.categoryId)?.name ?? "Kategoriya";
  }

  function birlikNomi(item: Mahsulot) {
    return item.unit?.shortName ?? item.unit?.name ?? store.birliklar.find((x) => x.id === item.unitId)?.shortName ?? "Birlik";
  }

  function mahsulotAmallari(item: Mahsulot, ixcham = false) {
    return (
      <div className={ixcham ? "flex justify-end gap-2" : "mt-5 grid grid-cols-[1fr_1fr_42px] gap-2 border-t pt-4"}>
        <button onClick={()=>{setModProduct(item);void store.modifikatsiyalarniYuklash(item.id)}} className={`inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 font-bold text-slate-600 ${ixcham ? "h-10 px-3 text-sm" : "py-2.5 text-sm"}`}><Eye size={15}/>{!ixcham&&"Variantlar"}</button>
        <button onClick={()=>void mahsulotTahrirlash(item)} className={`inline-flex items-center justify-center gap-1 rounded-xl bg-orange-50 font-bold text-orange-600 ${ixcham ? "h-10 px-3 text-sm" : "py-2.5 text-sm"}`}><Edit3 size={15}/>{!ixcham&&"Tahrirlash"}</button>
        <button onClick={()=>void mahsulotOchirish(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={16}/></button>
      </div>
    );
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border bg-white px-4 lg:flex-none"><Search size={17} className="text-gray-400"/><input value={qidiruv} onChange={e=>setQidiruv(e.target.value)} className="min-w-0 flex-1 outline-none" placeholder="Mahsulot, shtrix-kod yoki artikul..."/></label>
            <div className="relative">
              <button type="button" onClick={()=>setKorinishMenu((value)=>!value)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600 shadow-sm hover:border-orange-200 hover:text-orange-600 lg:w-auto">
                <TanlanganIcon size={17} className="text-orange-500"/>
                Ko'rinish
                {korinishMenu ? <ChevronUp size={16} className="text-orange-500"/> : <ChevronDown size={16} className="text-orange-500"/>}
              </button>
              {korinishMenu&&(
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-orange-100 bg-white p-2 shadow-xl">
                  {korinishlar.map((item)=>{
                    const Icon=item.icon;
                    return <button key={item.id} type="button" onClick={()=>{setKorinish(item.id);setKorinishMenu(false)}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${korinish===item.id?"bg-orange-500 text-white":"text-gray-600 hover:bg-orange-50 hover:text-orange-600"}`}><Icon size={17}/>{item.nom}</button>
                  })}
                </div>
              )}
            </div>
            <button disabled={store.kategoriyalar.length===0||store.birliklar.length===0} onClick={()=>setMahsulotModal("new")} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50"><Plus size={17}/>Mahsulot qo'shish</button>
          </div>
          {(store.kategoriyalar.length===0||store.birliklar.length===0)&&<div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">Mahsulot yaratishdan oldin kamida bitta kategoriya va o'lchov birligi yarating.</div>}
          {korinish==="kartochka" ? (
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
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-orange-50 text-xs font-black uppercase tracking-[0.12em] text-orange-600">
                    <tr>
                      <th className="px-5 py-4">Mahsulot</th>
                      <th className="px-5 py-4">Kategoriya</th>
                      <th className="px-5 py-4">Birlik</th>
                      <th className="px-5 py-4">Shtrix-kod</th>
                      <th className="px-5 py-4">Artikul</th>
                      <th className="px-5 py-4">Holat</th>
                      <th className="px-5 py-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {mahsulotlar.map((item)=>(
                      <tr key={item.id} className="hover:bg-orange-50/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Boxes size={19}/></div>
                            <span className="font-black text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-600">{kategoriyaNomi(item)}</td>
                        <td className="px-5 py-4 font-bold text-gray-600">{birlikNomi(item)}</td>
                        <td className="px-5 py-4 text-gray-500">{item.barcode||"Kiritilmagan"}</td>
                        <td className="px-5 py-4 text-gray-500">{item.article||"Kiritilmagan"}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isActive?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{item.isActive?"Faol":"Faol emas"}</span></td>
                        <td className="px-5 py-4">{mahsulotAmallari(item,true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mahsulotlar.length===0&&<Empty matn="Mahsulotlar mavjud emas"/>}
            </div>
          )}
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

      {mahsulotModal&&<MahsulotModalKeng item={mahsulotModal} onClose={()=>setMahsulotModal(null)}/>}
      {oddiyModal&&<OddiyModal tur={tab as "kategoriyalar"|"birliklar"} item={oddiyModal} onClose={()=>setOddiyModal(null)}/>}
      {modProduct&&<ModifikatsiyalarModal product={modProduct} onClose={()=>setModProduct(null)}/>}
    </div>
  );
}

function Empty({matn}:{matn:string}) {
  return <div className="col-span-full rounded-[24px] border border-dashed border-orange-200 p-12 text-center text-gray-400">{matn}</div>;
}

function formatNumberInput(value:string) {
  const [integer, decimal] = value.replace(/\s/g,"").split(".");
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
}

function MoneyInput({value,suffix,onChange,currency,onCurrencyChange,onApplyAll}:{value:string;suffix?:string;onChange:(value:string)=>void;currency?:"UZS"|"USD";onCurrencyChange?:(value:"UZS"|"USD")=>void;onApplyAll?:()=>void}) {
  return <div className="group relative">
    <input value={formatNumberInput(value)} onChange={(e)=>onChange(e.target.value)} className={`h-12 w-full rounded-2xl border-0 bg-gray-100 px-4 text-sm font-black text-gray-700 outline-none focus:ring-2 focus:ring-orange-100 ${currency?"pr-32":"pr-12"}`} placeholder="0"/>
    {currency&&onCurrencyChange?<select value={currency} onChange={(e)=>onCurrencyChange(e.target.value as "UZS"|"USD")} className="absolute right-2 top-1/2 h-9 min-w-[76px] -translate-y-1/2 rounded-xl border border-gray-200 bg-white px-2 text-xs font-black text-gray-600 outline-none hover:border-orange-200 focus:border-orange-300"><option value="UZS">UZS</option><option value="USD">USD</option></select>:<span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">{suffix}</span>}
    {onApplyAll&&value&&<button type="button" onClick={onApplyAll} className="absolute left-0 top-[calc(100%+4px)] z-20 hidden rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black text-white shadow-lg group-focus-within:block hover:bg-blue-700">Hammaga qo'llash</button>}
  </div>;
}

function MahsulotModalKeng({item,onClose}:{item:Mahsulot|"new";onClose:()=>void}) {
  const store=useMahsulotlarStore();
  const editing=item!=="new";
  const [name,setName]=useState(editing?item.name:"");
  const [categoryId,setCategoryId]=useState(editing?item.categoryId:store.kategoriyalar[0]?.id??"");
  const [unitId,setUnitId]=useState(editing?item.unitId:store.birliklar[0]?.id??"");
  const [barcode,setBarcode]=useState(editing?item.barcode??"":"");
  const [article,setArticle]=useState(editing?item.article??"":"");
  const [imageUrl,setImageUrl]=useState(editing?item.imageUrl??"":"");
  const [isActive,setIsActive]=useState(editing?item.isActive:true);
  const [variationRows,setVariationRows]=useState<VariationRow[]>([
    { id: Date.now(), attribute: "", attributeAdded: false, value: "", options: [] },
  ]);
  const [savedVariationOptions,setSavedVariationOptions]=useState<Record<string,string[]>>({});
  const [activeVariationRow,setActiveVariationRow]=useState<number|null>(null);
  const [variantDrafts,setVariantDrafts]=useState<Record<string,VariantDraft>>({});
  const imageInputRef=useRef<HTMLInputElement|null>(null);

  const variantCombinations = useMemo<VariantCombination[]>(() => {
    const completed = variationRows
      .filter((row) => row.attribute.trim() && row.options.length > 0)
      .map((row) => ({ attribute: row.attribute.trim(), options: row.options }));
    if (completed.length === 0) return [];
    return completed.reduce<VariantCombination[]>((items, row) => {
      if (items.length === 0) {
        return row.options.map((option) => ({
          key: `${row.attribute}:${option}`,
          label: option,
          params: { [row.attribute]: option },
        }));
      }
      return items.flatMap((item) =>
        row.options.map((option) => ({
          key: `${item.key}|${row.attribute}:${option}`,
          label: `${item.label} / ${option}`,
          params: { ...item.params, [row.attribute]: option },
        }))
      );
    }, []);
  }, [variationRows]);

  useEffect(() => {
    setVariantDrafts((drafts) => {
      const next: Record<string, VariantDraft> = {};
      variantCombinations.forEach((combo) => {
        next[combo.key] = drafts[combo.key] ?? {
          barcode: generateBarcodeValue(),
          imageUrl: "",
          active: true,
          costPrice: "",
          costCurrency: "UZS",
          markup: "",
          retailPrice: "",
          retailCurrency: "UZS",
          wholesalePrice: "",
          wholesaleCurrency: "UZS",
        };
      });
      return next;
    });
  }, [variantCombinations]);

  async function save(e:FormEvent){
    e.preventDefault();
    const variantParams=variationRows.reduce<Record<string, string[]>>((params,row)=>{
      const attribute=row.attribute.trim();
      if(attribute&&row.options.length>0)params[attribute]=row.options;
      return params;
    },{});
    const hasVariantParams=Object.keys(variantParams).length>0;
    const generatedVariants=variantCombinations
      .filter((combo)=>variantDrafts[combo.key]?.active!==false)
      .map((combo)=>({
        name:combo.label,
        barcode:variantDrafts[combo.key]?.barcode||generateBarcodeValue(),
        article:article.trim()||undefined,
        params:combo.params,
        price:{
          costPrice:Number(variantDrafts[combo.key]?.costPrice||0),
          retailPrice:Number(variantDrafts[combo.key]?.retailPrice||0),
          wholesalePrice:Number(variantDrafts[combo.key]?.wholesalePrice||variantDrafts[combo.key]?.retailPrice||0),
        },
      }));
    if(!name.trim()||!categoryId||!unitId||(!editing&&generatedVariants.length===0&&!barcode.trim()))return;
    const safeImageUrl=imageUrl.trim().startsWith("blob:")?"":imageUrl.trim();
    const data={name:name.trim(),categoryId,unitId,barcode:barcode.trim()||undefined,article:article.trim()||undefined,imageUrl:safeImageUrl||undefined,isActive};
    const ok=editing
      ?await store.mahsulotSaqlash(item.id,data)
      :generatedVariants.length>0
        ?await store.mahsulotVariantlarBilanYaratish(data,generatedVariants)
        :await store.mahsulotNarxBilanYaratish(data,{
          name:hasVariantParams?Object.values(variantParams).flat().join(", "):"Asosiy variant",
          barcode:barcode.trim(),
          article:article.trim()||undefined,
          params:hasVariantParams?variantParams:undefined,
          price:{
            costPrice:0,
            retailPrice:0,
            wholesalePrice:0,
          },
        });
    if(ok)onClose()
  }

  function generateArticle() {
    const prefix=name.trim().slice(0,3).toUpperCase().replace(/[^A-Z0-9]/g,"")||"PRD";
    setArticle(`${prefix}-${Date.now().toString().slice(-6)}`);
  }

  function generateBarcodeValue() {
    return `478${Math.floor(100000000+Math.random()*900000000)}`;
  }

  function generateBarcode() {
    setBarcode(generateBarcodeValue());
  }

  function quickFill() {
    if(!article.trim())generateArticle();
    if(!barcode.trim())generateBarcode();
  }

  function selectImage(file?:File) {
    if(!file||!file.type.startsWith("image/"))return;
    setImageUrl(URL.createObjectURL(file));
  }

  function handleImageChange(e:ChangeEvent<HTMLInputElement>) {
    selectImage(e.target.files?.[0]);
  }

  function handleImageDrop(e:DragEvent<HTMLDivElement>) {
    e.preventDefault();
    selectImage(e.dataTransfer.files?.[0]);
  }

  function updateVariationRow(id:number, patch:Partial<{attribute:string;attributeAdded:boolean;value:string;options:string[]}>) {
    setVariationRows((rows)=>rows.map((row)=>row.id===id?{...row,...patch}:row));
  }

  function addVariationAttribute(id:number) {
    const row=variationRows.find((item)=>item.id===id);
    if(!row?.attribute.trim())return;
    updateVariationRow(id,{attributeAdded:true});
  }

  function addVariationOption(id:number) {
    const row=variationRows.find((item)=>item.id===id);
    const value=row?.value.trim()??"";
    if(!row||!value||row.options.includes(value))return;
    const attribute=row.attribute.trim();
    if(attribute)setSavedVariationOptions((saved)=>({...saved,[attribute]:Array.from(new Set([...(saved[attribute]??[]),value]))}));
    const nextRows=variationRows.map((item)=>item.id===id?{...item,value:"",options:[...item.options,value]}:item);
    const lastRow=nextRows[nextRows.length-1];
    setVariationRows(lastRow.id===id?[...nextRows,{id:Date.now()+1,attribute:"",attributeAdded:false,value:"",options:[]}]:nextRows);
  }

  function selectSavedVariationOption(id:number, option:string) {
    const nextRows=variationRows.map((row)=>row.id===id&& !row.options.includes(option)?{...row,value:"",options:[...row.options,option]}:row);
    const lastRow=nextRows[nextRows.length-1];
    setVariationRows(lastRow.id===id?[...nextRows,{id:Date.now()+1,attribute:"",attributeAdded:false,value:"",options:[]}]:nextRows);
    setActiveVariationRow(null);
  }

  function removeVariationRow(id:number) {
    setVariationRows((rows)=>{
      const next=rows.filter((row)=>row.id!==id);
      return next.length>0?next:[{id:Date.now(),attribute:"",attributeAdded:false,value:"",options:[]}];
    });
  }

  function removeVariationOption(id:number, option:string) {
    setVariationRows((rows)=>rows.map((row)=>row.id===id?{...row,options:row.options.filter((item)=>item!==option)}:row));
  }

  function savedOptionsFor(row:VariationRow) {
    const query=row.value.trim().toLowerCase();
    return (savedVariationOptions[row.attribute.trim()]??[]).filter((option)=>
      !row.options.includes(option)&&(!query||option.toLowerCase().includes(query))
    );
  }

  function updateVariantDraft(key:string, patch:Partial<VariantDraft>) {
    setVariantDrafts((drafts)=>({
      ...drafts,
      [key]: {...(drafts[key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"}),...patch},
    }));
  }

  function updateVariantPrice(key:string, field:"costPrice"|"markup"|"retailPrice"|"wholesalePrice", value:string) {
    const numericValue=value.replace(/[^\d.]/g,"");
    const current=variantDrafts[key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
    const patch:Partial<VariantDraft>={[field]:numericValue};
    if(field==="costPrice"||field==="markup"){
      const cost=Number(field==="costPrice"?numericValue:current.costPrice||0);
      const markup=Number(field==="markup"?numericValue:current.markup||0);
      if(cost>0&&markup>=0)patch.retailPrice=String(Math.round(cost+(cost*markup/100)));
    }
    if(field==="retailPrice"){
      const cost=Number(current.costPrice||0);
      const retail=Number(numericValue||0);
      if(cost>0&&retail>=0)patch.markup=String(Number((((retail-cost)/cost)*100).toFixed(2)));
    }
    updateVariantDraft(key,patch);
  }

  function applyCostToAll(sourceKey:string) {
    const source=variantDrafts[sourceKey];
    if(!source?.costPrice)return;
    setVariantDrafts((drafts)=>{
      const next={...drafts};
      variantCombinations.forEach((combo)=>{
        const current=next[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
        const cost=Number(source.costPrice||0);
        const markup=Number(current.markup||0);
        next[combo.key]={
          ...current,
          costPrice:source.costPrice,
          costCurrency:source.costCurrency,
          retailPrice:cost>0&&markup>=0?String(Math.round(cost+(cost*markup/100))):current.retailPrice,
        };
      });
      return next;
    });
  }

  function applyMarkupToAll(sourceKey:string) {
    const source=variantDrafts[sourceKey];
    if(!source?.markup)return;
    setVariantDrafts((drafts)=>{
      const next={...drafts};
      variantCombinations.forEach((combo)=>{
        const current=next[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
        const cost=Number(current.costPrice||0);
        const markup=Number(source.markup||0);
        next[combo.key]={
          ...current,
          markup:source.markup,
          retailPrice:cost>0&&markup>=0?String(Math.round(cost+(cost*markup/100))):current.retailPrice,
        };
      });
      return next;
    });
  }

  function applyRetailToAll(sourceKey:string) {
    const source=variantDrafts[sourceKey];
    if(!source?.retailPrice)return;
    setVariantDrafts((drafts)=>{
      const next={...drafts};
      variantCombinations.forEach((combo)=>{
        const current=next[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
        const cost=Number(current.costPrice||0);
        const retail=Number(source.retailPrice||0);
        next[combo.key]={
          ...current,
          retailPrice:source.retailPrice,
          retailCurrency:source.retailCurrency,
          markup:cost>0&&retail>=0?String(Number((((retail-cost)/cost)*100).toFixed(2))):current.markup,
        };
      });
      return next;
    });
  }

  function handleVariantImage(key:string, file?:File) {
    if(!file||!file.type.startsWith("image/"))return;
    updateVariantDraft(key,{imageUrl:URL.createObjectURL(file)});
  }

  return <AppModal><form onSubmit={save} className="scrollbar-hidden max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white"><X size={18}/></button>
        <h2 className="truncate text-2xl font-black">{editing?"Mahsulotni tahrirlash":"Yangi mahsulot"}</h2>
      </div>
      <button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white shadow-sm disabled:opacity-50">{store.amalBajarilmoqda&&<LoaderCircle size={16} className="animate-spin"/>}{editing?"Saqlash":"Yaratish"}</button>
    </div>

    <div className="px-6 py-6">
      <main className="min-w-0 space-y-8">
        {store.xatolik&&<div className="mb-4"><ErrorBox/></div>}
        <section className="space-y-5">
          <div className="flex items-center gap-4"><h3 className="text-xl font-black">Asosiy</h3><div className="h-px flex-1 bg-gray-100"/></div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-500">Nomi *
                <div className="relative mt-2">
                  <input value={name} onChange={e=>setName(e.target.value)} className="input pr-40" placeholder="Nomi kiriting"/>
                  <button type="button" onClick={quickFill} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-sm font-black text-orange-600 hover:bg-orange-50">Tez qo'shish</button>
                </div>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-black text-gray-500">Artikul *
                  <div className="relative mt-2">
                    <input value={article} onChange={e=>setArticle(e.target.value)} className="input pr-36" placeholder="Artikul kiriting"/>
                    <button type="button" onClick={generateArticle} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-sm font-black text-orange-600 hover:bg-orange-50">Generatsiya</button>
                  </div>
                </label>
                <label className="block text-sm font-black text-gray-500">Barkod{editing?"":" *"}
                  <div className="relative mt-2">
                    <input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input pr-36" placeholder="Barkod kiriting"/>
                    <button type="button" onClick={generateBarcode} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-sm font-black text-orange-600 hover:bg-orange-50">Generatsiya</button>
                  </div>
                </label>
                <label className="block text-sm font-black text-gray-500">Kategoriya *
                  <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="input mt-2"><option value="">Kategoriya tanlang</option>{store.kategoriyalar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
                </label>
                <label className="block text-sm font-black text-gray-500">O'lchov birligi *
                  <select value={unitId} onChange={e=>setUnitId(e.target.value)} className="input mt-2"><option value="">O'lchov birligi tanlang</option>{store.birliklar.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-gray-500">Foto</p>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden"/>
              <div
                role="button"
                tabIndex={0}
                onClick={()=>imageInputRef.current?.click()}
                onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" ")imageInputRef.current?.click()}}
                onDragOver={(e)=>e.preventDefault()}
                onDrop={handleImageDrop}
                className="flex min-h-[236px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-gray-100 px-5 py-6 text-center transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                {imageUrl ? <img src={imageUrl} alt="Mahsulot rasmi" className="max-h-48 rounded-2xl object-contain"/> : <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm"><ImagePlus size={24}/></div>
                  <p className="font-black text-gray-600">Rasmni shu joyga tashlang</p>
                  <p className="mt-1 text-sm font-bold text-gray-400">yoki</p>
                  <p className="text-sm font-black text-orange-600">Tanlash uchun bosing</p>
                </>}
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4"><h3 className="text-xl font-black">Variatsiyalar</h3><div className="h-px flex-1 bg-gray-100"/></div>
            <div>
              <p className="text-sm font-black text-gray-500">Variatsiya atributini tanlang *</p>
              <p className="mt-1 text-xs font-bold text-gray-400">Masalan: Rang</p>
              <div className="mt-3 space-y-4">
                {variationRows.map((row)=>(
                  <div key={row.id} className={`grid gap-4 ${row.attributeAdded?"md:grid-cols-2":"md:grid-cols-[minmax(260px,420px)]"}`}>
                    <div className="space-y-2">
                      <div className="relative">
                        <input value={row.attribute} onChange={e=>updateVariationRow(row.id,{attribute:e.target.value,attributeAdded:false,value:"",options:[]})} className="input pr-12" placeholder="Atribut kiriting"/>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                      </div>
                      {!row.attributeAdded&&row.attribute.trim()&&<button type="button" onClick={()=>addVariationAttribute(row.id)} className="flex w-full items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600"><Plus size={16}/>Qo'shish "{row.attribute.trim()}"</button>}
                      {!row.attribute.trim()&&<div className="rounded-2xl bg-gray-50 px-4 py-3 text-center text-sm font-bold text-gray-400">Variantlar yo'q</div>}
                    </div>
                    {row.attributeAdded&&<div className="relative space-y-2">
                      <div className="flex min-h-12 items-center gap-2 rounded-2xl border bg-white px-3 py-2 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          {row.options.map((option)=><span key={option} className="inline-flex max-w-full items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-orange-600"><span className="truncate">{option}</span><button type="button" onClick={()=>removeVariationOption(row.id,option)} className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white"><X size={12}/></button></span>)}
                          <input value={row.value} onFocus={()=>setActiveVariationRow(row.id)} onChange={e=>{updateVariationRow(row.id,{value:e.target.value});setActiveVariationRow(row.id)}} onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addVariationOption(row.id)}}} className="h-8 min-w-28 flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none" placeholder={row.options.length?"Yana qo'shish":`${row.attribute} qiymatini kiriting`}/>
                        </div>
                        <span className="shrink-0 text-gray-300">⋮⋮</span>
                        <button type="button" onClick={()=>removeVariationRow(row.id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"><X size={14}/></button>
                      </div>
                      {activeVariationRow===row.id&&savedOptionsFor(row).length>0&&<div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
                        {savedOptionsFor(row).map((option)=><button key={option} type="button" onMouseDown={(e)=>{e.preventDefault();selectSavedVariationOption(row.id,option)}} className="block w-full px-5 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600">{option}</button>)}
                      </div>}
                      {row.value.trim()&&<button type="button" onClick={()=>addVariationOption(row.id)} className="flex w-full items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-black text-gray-600 hover:bg-orange-50 hover:text-orange-600"><Plus size={16}/>Qo'shish "{row.value.trim()}"</button>}
                    </div>}
                  </div>
                ))}
              </div>
            </div>
            {variantCombinations.length>0&&<div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white">
              <div className="grid grid-cols-[70px_1fr_220px_90px] border-b border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-gray-500">
                <span>Foto</span>
                <span>Variatsiya</span>
                <span>Barkod *</span>
                <span className="text-right">Holat</span>
              </div>
              <div className="divide-y divide-gray-100">
                {variantCombinations.map((combo)=>{
                  const draft=variantDrafts[combo.key]??{barcode:"",imageUrl:"",active:true};
                  return <div key={combo.key} className="grid grid-cols-[70px_1fr_220px_90px] items-center gap-4 px-4 py-3">
                    <label className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-orange-600 hover:bg-orange-50">
                      {draft.imageUrl?<img src={draft.imageUrl} alt={combo.label} className="h-full w-full object-cover"/>:<Plus size={18}/>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleVariantImage(combo.key,e.target.files?.[0])}/>
                    </label>
                    <div className="font-black text-gray-600">{combo.label}</div>
                    <div className="relative">
                      <input value={draft.barcode} onChange={(e)=>updateVariantDraft(combo.key,{barcode:e.target.value})} className="input h-11 pr-24" placeholder="Barkod"/>
                      <button type="button" onClick={()=>updateVariantDraft(combo.key,{barcode:generateBarcodeValue()})} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs font-black text-orange-600 hover:bg-orange-50">Generatsiya</button>
                    </div>
                    <button type="button" onClick={()=>updateVariantDraft(combo.key,{active:!draft.active})} className={`ml-auto flex h-8 w-14 items-center rounded-full p-1 transition ${draft.active?"bg-blue-500":"bg-gray-200"}`}>
                      <span className={`h-6 w-6 rounded-full bg-white shadow transition ${draft.active?"translate-x-6":"translate-x-0"}`}/>
                    </button>
                  </div>
                })}
              </div>
            </div>}
            {variantCombinations.length>0&&<div className="overflow-x-auto rounded-[24px] border border-gray-100 bg-white">
              <div className="grid min-w-[1080px] grid-cols-[1fr_230px_150px_230px_230px] border-b border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-gray-500">
                <span>Variatsiya</span>
                <span>Kelish narxi *</span>
                <span>Ustama</span>
                <span>Sotuv narxi *</span>
                <span>Ulgurji narx</span>
              </div>
              <div className="divide-y divide-gray-100">
                {variantCombinations.map((combo)=>{
                  const draft=variantDrafts[combo.key]??{barcode:"",imageUrl:"",active:true,costPrice:"",costCurrency:"UZS",markup:"",retailPrice:"",retailCurrency:"UZS",wholesalePrice:"",wholesaleCurrency:"UZS"};
                  return <div key={combo.key} className="grid min-w-[1080px] grid-cols-[1fr_230px_150px_230px_230px] items-center gap-4 px-4 py-3">
                    <div className="font-black text-gray-600">{combo.label}</div>
                    <MoneyInput value={draft.costPrice} currency={draft.costCurrency} onChange={(value)=>updateVariantPrice(combo.key,"costPrice",value)} onCurrencyChange={(value)=>updateVariantDraft(combo.key,{costCurrency:value})} onApplyAll={()=>applyCostToAll(combo.key)}/>
                    <MoneyInput value={draft.markup} suffix="%" onChange={(value)=>updateVariantPrice(combo.key,"markup",value)} onApplyAll={()=>applyMarkupToAll(combo.key)}/>
                    <MoneyInput value={draft.retailPrice} currency={draft.retailCurrency} onChange={(value)=>updateVariantPrice(combo.key,"retailPrice",value)} onCurrencyChange={(value)=>updateVariantDraft(combo.key,{retailCurrency:value})} onApplyAll={()=>applyRetailToAll(combo.key)}/>
                    <MoneyInput value={draft.wholesalePrice} currency={draft.wholesaleCurrency} onChange={(value)=>updateVariantPrice(combo.key,"wholesalePrice",value)} onCurrencyChange={(value)=>updateVariantDraft(combo.key,{wholesaleCurrency:value})}/>
                  </div>
                })}
              </div>
            </div>}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4"><h3 className="text-xl font-black">Holat</h3><div className="h-px flex-1 bg-gray-100"/></div>
          <label className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4 font-bold text-gray-700"><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="h-5 w-5 accent-orange-500"/>Mahsulot faol</label>
        </section>
      </main>
    </div>

    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
      <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Bekor qilish</button>
      <button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{store.amalBajarilmoqda&&<LoaderCircle size={16} className="animate-spin"/>}{editing?"Saqlash":"Yaratish"}</button>
    </div>
  </form></AppModal>
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

void MahsulotModal;

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
  return <AppModal><form onSubmit={save} className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex justify-between"><h2 className="text-2xl font-black">{editing?"Variantni tahrirlash":"Yangi variant"}</h2><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><X size={18}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="Variant nomi"/><input value={barcode} onChange={e=>setBarcode(e.target.value)} className="input" placeholder="Shtrix-kod *"/><input value={article} onChange={e=>setArticle(e.target.value)} className="input" placeholder="Artikul"/><input value={params} onChange={e=>setParams(e.target.value)} className="input" placeholder='Parametrlar JSON: {"rang":"qizil"}'/><input type="number" min="0" value={cost} onChange={e=>setCost(Number(e.target.value))} className="input" placeholder="Tan narx"/><input type="number" min="0" value={retail} onChange={e=>setRetail(Number(e.target.value))} className="input" placeholder="Chakana narx"/><input type="number" min="0" value={wholesale} onChange={e=>setWholesale(Number(e.target.value))} className="input" placeholder="Ulgurji narx"/></div>{jsonError&&<p className="mt-3 text-sm font-bold text-red-500">{jsonError}</p>}<Actions loading={store.amalBajarilmoqda} onClose={onClose}/></form></AppModal>
}

function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){return <AppModal><div className={`scrollbar-hidden max-h-[94vh] w-full overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl ${wide?"max-w-5xl":"max-w-xl"}`}><div className="mb-5 flex justify-between gap-4"><h2 className="text-2xl font-black">{title}</h2><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-orange-500 hover:text-white"><X size={18}/></button></div>{children}</div></AppModal>}
function Actions({loading,onClose}:{loading:boolean;onClose:()=>void}){return <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Bekor qilish</button><button disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{loading&&<LoaderCircle size={16} className="animate-spin"/>}Saqlash</button></div>}
function ErrorBox(){const x=useMahsulotlarStore(s=>s.xatolik);return <div className="rounded-xl bg-red-50 p-3 font-bold text-red-600">{x}</div>}
function money(value:number|string|undefined){return `${Number(value??0).toLocaleString("uz-UZ")} so'm`}
