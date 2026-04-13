import { Outlet } from "react-router";
import { ScrollToTop } from "./ScrollToTop";
import { DataSeeder } from "./DataSeeder";

export default function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <DataSeeder />
      <Outlet />
    </>
  );
}