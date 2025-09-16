import Footer from '@/components/footer';
import Header from '@/components/header';
import FloatingQnaButton from '@/components/floating-qna-button';
import { Suspense } from 'react';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <div className='flex flex-col min-h-screen'>
            <Header />
            <main className="flex-1">{children}</main>
            <Suspense fallback={null}>
                <FloatingQnaButton />
            </Suspense>
            <Footer />
        </div>
    );
}
