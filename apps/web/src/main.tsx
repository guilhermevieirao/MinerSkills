// A folha global (camadas, tokens, base) entra antes de qualquer componente:
// no dev cada .scss vira um <style> na ordem de avaliação dos módulos.
import './styles/main.scss';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { ToastProvider } from './components/ui/Toast';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { ReloadPrompt } from './components/pwa/ReloadPrompt';

// Fontes self-hosted (sem CDN externo — compatível com CSP e PWA offline)
// Geist: títulos e interface · Geist Mono: só números (contadores, placares)
// Chakra Petch 700: só o wordmark do logo (components/brand/Logo.tsx)
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/chakra-petch/700.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* prefers-reduced-motion vale para toda animação do motion (o CSS já respeita via _motion.scss) */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          {/* Faixa "offline" e aviso de nova versão vivem fora do router: valem para o site e o painel */}
          <OfflineBanner />
          <RouterProvider router={router} />
          <ReloadPrompt />
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
