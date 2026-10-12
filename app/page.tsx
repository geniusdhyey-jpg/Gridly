import GridlyApp from "@/components/gridly-app";
import { opportunities, organizations } from "@/lib/opportunities";

export default function Home() {
  return <GridlyApp opportunities={opportunities} organizations={organizations}/>;
}
