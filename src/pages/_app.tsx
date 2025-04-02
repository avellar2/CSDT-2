import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { HeaderProvider } from '../context/HeaderContext';
import { Header } from '../components/Header';
import '../styles/globals.css'; // Adjust the path to your global styles if necessary
import '../styles/modal.css'; // Importar os estilos personalizados
import { ThemeProvider } from '@/components/theme-provider';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  return (
    <ThemeProvider attribute={'class'} defaultTheme='system' enableSystem disableTransitionOnChange>
      <div className='container mx-auto'>
        <HeaderProvider>
          {!isLoginPage && <Header />}
          <Component {...pageProps} />
        </HeaderProvider>
      </div>
    </ThemeProvider>
  );
}

export default MyApp;
