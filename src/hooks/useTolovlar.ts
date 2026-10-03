import { useCallback, useEffect, useState } from "react";
import { barchaFinanceTransactions, financeTransactions } from "@/api/tolovApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Qaytarish, Sotuv } from "@/types/savdo";
import type { FinanceTransaction, TolovFiltrlari, TolovYozuvi } from "@/types/tolov";
import { mijozNomi as sotuvMijozNomi } from "@/Pages/Savdo/savdoYordamchilari";

const initial:TolovFiltrlari={search:"",turi:"BARCHASI",tolovTuri:"BARCHASI",manba:"BARCHASI",startDate:"",endDate:"",page:1,pageSize:10};
function row(item:FinanceTransaction,sales:Sotuv[]):TolovYozuvi{
 const bogliqSotuv=item.source==="SALE"&&item.refId?sales.find((sotuv)=>sotuv.id===item.refId):undefined;
 const mijoz=item.counterpartyName||(bogliqSotuv?sotuvMijozNomi(bogliqSotuv):undefined)||item.note||"-";
 return {id:item.id,sotuvId:item.refDocNumber||item.refId||item.id,mijoz,turi:item.type==="INCOME"?"KIRIM":"CHIQIM",tolovTuri:item.paymentType,summa:Number(item.amount??0),sana:item.date,manba:item.source,sotuv:bogliqSotuv,raw:item};
}
export function useTolovlar(sales:Sotuv[],_returns:Qaytarish[]){
 void _returns;
 const [refreshKey,setRefreshKey]=useState(0),[filtrlar,setFiltrlar]=useState(initial),[rows,setRows]=useState<TolovYozuvi[]>([]),[jami,setJami]=useState(0),[totalPages,setTotalPages]=useState(1),[yuklanmoqda,setLoading]=useState(false),[xatolik,setError]=useState<string|null>(null);
 const yuklash=useCallback(async()=>{setLoading(true);setError(null);try{const result=await financeTransactions({search:filtrlar.search.trim()||undefined,type:filtrlar.turi==="KIRIM"?"INCOME":filtrlar.turi==="CHIQIM"?"EXPENSE":undefined,paymentType:filtrlar.tolovTuri==="BARCHASI"?undefined:String(filtrlar.tolovTuri),source:filtrlar.manba==="BARCHASI"?undefined:filtrlar.manba,dateFrom:filtrlar.startDate||undefined,dateTo:filtrlar.endDate||undefined,page:filtrlar.page,pageSize:filtrlar.pageSize});setRows(result.items.map((item)=>row(item,sales)));setJami(result.total);setTotalPages(Math.max(result.totalPages,1))}catch(e){setError(getApiErrorMessage(e))}finally{setLoading(false)}},[filtrlar,sales]);
 useEffect(()=>{const timer=window.setTimeout(()=>void yuklash(),300);return()=>window.clearTimeout(timer)},[yuklash]);
 function filtrniYangilash(patch:Partial<TolovFiltrlari>){setFiltrlar(current=>({...current,...patch,page:patch.page??1}))}
 // Kartalar uchun: joriy filtrlarga mos BARCHA yozuvlar bo'yicha jami kirim/chiqim (sahifalashsiz).
 const [xulosa,setXulosa]=useState({kirim:0,chiqim:0,yuklanmoqda:true});
 useEffect(()=>{
  let faol=true;
  setXulosa((old)=>({...old,yuklanmoqda:true}));
  const timer=window.setTimeout(()=>{
   void barchaFinanceTransactions({search:filtrlar.search.trim()||undefined,type:filtrlar.turi==="KIRIM"?"INCOME":filtrlar.turi==="CHIQIM"?"EXPENSE":undefined,paymentType:filtrlar.tolovTuri==="BARCHASI"?undefined:String(filtrlar.tolovTuri),source:filtrlar.manba==="BARCHASI"?undefined:filtrlar.manba,dateFrom:filtrlar.startDate||undefined,dateTo:filtrlar.endDate||undefined})
    .then((items)=>{
     if(!faol)return;
     let kirim=0,chiqim=0;
     for(const item of items){
      if(item.status==="CANCELLED"||item.status==="DRAFT")continue;
      const summa=Number(item.amount??0);
      if(item.type==="INCOME")kirim+=summa;else chiqim+=summa;
     }
     setXulosa({kirim,chiqim,yuklanmoqda:false});
    })
    .catch(()=>{if(faol)setXulosa({kirim:0,chiqim:0,yuklanmoqda:false})});
  },300);
  return()=>{faol=false;window.clearTimeout(timer)};
 },[filtrlar.search,filtrlar.turi,filtrlar.tolovTuri,filtrlar.manba,filtrlar.startDate,filtrlar.endDate,refreshKey]);
 return {rows,jami,xulosa,barchaJami:jami,currentPage:filtrlar.page,totalPages,filtrlar,yuklanmoqda,xatolik,refetch:()=>{setRefreshKey((k)=>k+1);return yuklash()},filtrniYangilash};
}
