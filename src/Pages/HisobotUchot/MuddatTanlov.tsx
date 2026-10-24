import DateRangePicker from "@/Components/ui/DateRangePicker";

export default function MuddatTanlov({
  dateFrom,
  dateTo,
  onChange,
  timeZone,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
  timeZone?: "Asia/Tashkent";
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-gray-700">Muddat</span>
      <DateRangePicker from={dateFrom} to={dateTo} onChange={onChange} compact timeZone={timeZone} />
    </div>
  );
}
