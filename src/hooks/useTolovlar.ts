import { useCallback, useEffect, useState } from "react";
import { financeTransactions } from "@/api/tolovApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Qaytarish, Sotuv } from "@/types/savdo";
import type { FinanceTransaction, TolovFiltrlari, TolovYozuvi } from "@/types/tolov";

const initial:TolovFiltrlari={search:"",turi:"BARCHASI",tolovTuri:"BARCHASI",manba:"BARCHASI",startDate:"",endDate:"",page:1,pageSize:10};
function row(item:FinanceTransaction):TolovYozuvi{return {id:item.id,sotuvId:item.refDocNumber||item.refId||item.id,mijoz:item.note||item.source,turi:item.type==="INCOME"?"KIRIM":"CHIQIM",tolovTuri:item.paymentType,summa:Number(item.amount??0),sana:item.date,manba:item.source,raw:item}}
export function useTolovlar(_sales:Sotuv[],_returns:Qaytarish[]){
 void _sales; void _returns;
 const [filtrlar,setFiltrlar]=useState(initial),[rows,setRows]=useState<TolovYozuvi[]>([]),[jami,setJami]=useState(0),[totalPages,setTotalPages]=useState(1),[yuklanmoqda,setLoading]=useState(false),[xatolik,setError]=useState<string|null>(null);
 const yuklash=useCallback(async()=>{setLoading(true);setError(null);try{const result=await financeTransactions({search:filtrlar.search.trim()||undefined,type:filtrlar.turi==="KIRIM"?"INCOME":filtrlar.turi==="CHIQIM"?"EXPENSE":undefined,paymentType:filtrlar.tolovTuri==="BARCHASI"?undefined:String(filtrlar.tolovTuri),source:filtrlar.manba==="BARCHASI"?undefined:filtrlar.manba,dateFrom:filtrlar.startDate||undefined,dateTo:filtrlar.endDate||undefined,page:filtrlar.page,pageSize:filtrlar.pageSize});setRows(result.items.map(row));setJami(result.total);setTotalPages(Math.max(result.totalPages,1))}catch(e){setError(getApiErrorMessage(e))}finally{setLoading(false)}},[filtrlar]);
 useEffect(()=>{const timer=window.setTimeout(()=>void yuklash(),300);return()=>window.clearTimeout(timer)},[yuklash]);
 function filtrniYangilash(patch:Partial<TolovFiltrlari>){setFiltrlar(current=>({...current,...patch,page:patch.page??1}))}
 return {rows,jami,barchaJami:jami,currentPage:filtrlar.page,totalPages,filtrlar,yuklanmoqda,xatolik,refetch:yuklash,filtrniYangilash};
}
