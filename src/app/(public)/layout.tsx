import Theme from "@/components/home/Theme";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import LeftSidebar from "@/components/home/LeftSidebar";
import RightSidebar from "@/components/home/RightSidebar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="_layout _layout_main_wrapper">
            <Theme />
            <div className="_main_layout">
                <Header />
                <div className="container _custom_container">
                    <div className="_layout_inner_wrap">
                        <div className="row">
                            <LeftSidebar />
                            <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">{children}</div>
                            <RightSidebar />
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}
