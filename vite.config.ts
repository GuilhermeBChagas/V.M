
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Função para obter o hash do commit git atual
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'dev';
  }
};

// Função para gerar o Build Number sequencial baseado no total de commits
const getBuildVersion = () => {
  const MAJOR = 1;
  const MINOR = 0;
  const PATCH = 0;

  try {
    const isCI = process.env.VERCEL || process.env.CI;
    const totalCommits = parseInt(execSync('git rev-list --count HEAD').toString().trim());

    // Vercel/CI usually has a shallow clone depth of 10.
    // If we detect we are in CI and the number is small (like 10), 
    // we use a base offset to restore the real count.
    // Current total is 88. Let's use 78 as base if we see 10.
    let finalCount = totalCommits;
    if (isCI && totalCommits <= 15) {
      const BASE_COMMITS = 78; // Commits before the current shallow window
      finalCount = BASE_COMMITS + totalCommits;
    }

    return `${MAJOR}.${MINOR}.${PATCH}.${finalCount.toString().padStart(3, '0')}`;
  } catch (e) {
    return `${MAJOR}.${MINOR}.${PATCH}.dev`;
  }
};

const gitHash = getGitHash();
const buildDate = new Date().toLocaleDateString('pt-BR');
const appVersion = getBuildVersion(); // Versão no formato MAJOR.MINOR.PATCH.BUILD

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Definição de constantes globais para versionamento (evita problemas com process.env no browser)
    '__APP_VERSION__': JSON.stringify(appVersion),
    '__GIT_HASH__': JSON.stringify(gitHash),
    '__BUILD_DATE__': JSON.stringify(buildDate),

    // Garante que process.env funcione no navegador para compatibilidade com código existente
    // Usamos || '' para evitar que JSON.stringify retorne undefined
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
  },
  server: {
    port: 3000,
  }
});
