import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { HeaderProvider } from '../context/HeaderContext';
import { Header } from '../components/Header';
import '../styles/globals.css'; // Outros estilos globais, se houver
import '../styles/modal.css'; // Importar os estilos personalizados
import '../styles/calendar.css'; // Importação do CSS global
import { ThemeProvider } from '@/components/theme-provider';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';
  const isConfirmarOsPage = router.pathname === '/confirmar-os-externa';

  return (
    <ThemeProvider attribute={'class'} defaultTheme='system' enableSystem disableTransitionOnChange>
      <div className='container mx-auto'>
        <HeaderProvider>
          {!isLoginPage && <Header hideHamburger={isConfirmarOsPage} />}
          <Component {...pageProps} />
        </HeaderProvider>
      </div>
    </ThemeProvider>
  );
}

export default MyApp;
