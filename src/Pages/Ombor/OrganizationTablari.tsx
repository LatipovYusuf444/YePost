import { useTranslation } from "react-i18next";

import ModalTablari from "@/Components/common/ModalTablari";
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
    <ModalTablari
      tablar={tablar.map((tab) => ({ id: tab.id, nom: t(tab.nomKaliti) }))}
      faol={faolTab}
      onChange={(id) => onTab(id as OrganizationTab)}
    />
  );
}
