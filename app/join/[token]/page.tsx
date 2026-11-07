import type { Metadata } from "next";
import JoinHousehold from "../../../components/JoinHousehold";

export const metadata: Metadata = { title: "Join a household — Every Chef", robots: { index: false } };

export default function Join({ params }: { params: { token: string } }) {
  return <JoinHousehold token={params.token} />;
}
