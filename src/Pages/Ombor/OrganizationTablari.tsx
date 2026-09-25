import { useTranslation } from "react-i18next";

export type OrganizationTab = "kompaniyalar" | "filiallar" | "omborlar";

type Props = {
  faolTab: OrganizationTab;
  onTab: (tab: OrganizationTab) => void;
};

const tablar: Array<{ id: OrganizationTab; nomKaliti: string }> = [
  { id: "kompaniyalar", nomKaliti: "organizationTablari.tabs.kompaniyalar" },
  { id: "filiallar", nomKaliti: "organizationTablari.tabs.filiallar" },
  { id: "omborlar", nomKaliti: "organizationTablari.tabs.omborlar" },
];

export default function OrganizationTablari({ faolTab, onTab }: Props) {
  const { t } = useTranslation("ombor_kichik");
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-sm">
      {tablar.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTab(tab.id)}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold ${
            faolTab === tab.id
              ? "bg-orange-500 text-white"
              : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          {t(tab.nomKaliti)}
        </button>
      ))}
    </div>
  );
}
