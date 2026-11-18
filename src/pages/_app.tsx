import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { HeaderProvider } from '../context/HeaderContext';
import { PrinterNotificationProvider } from '../context/PrinterNotificationContext';
import { Header } from '../components/Header';
import { PrinterCriticalAlert } from '../components/PrinterCriticalAlert';
import '../styles/globals.css'; // Outros estilos globais, se houver
import '../styles/modal.css'; // Importar os estilos personalizados
import '../styles/calendar.css'; // Importação do CSS global
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router?.pathname ?? '';
  const isLoginPage = pathname === '/login';
  const isConfirmarOsPage = pathname === '/confirmar-os-externa';
  // A pesquisa pública é acessada por link, sem login e sem o chrome do sistema.
  const isPublicSurveyPage = pathname.startsWith('/pesquisa');

  return (
    <ThemeProvider attribute={'class'} defaultTheme='system' enableSystem disableTransitionOnChange>
      <PrinterNotificationProvider>
        <div className={isLoginPage || isPublicSurveyPage ? 'w-full h-full' : 'container mx-auto'}>
          <HeaderProvider>
            {!isLoginPage && !isPublicSurveyPage && <Header hideHamburger={isConfirmarOsPage} />}
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
            {!isLoginPage && !isPublicSurveyPage && <PrinterCriticalAlert />}
          </HeaderProvider>
        </div>
      </PrinterNotificationProvider>
    </ThemeProvider>
  );
}

export default MyApp;
