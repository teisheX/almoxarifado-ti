import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE:
// Se o nome do seu repositório no GitHub for diferente de "almoxarifado-ti",
// altere o base abaixo para: '/NOME-DO-SEU-REPOSITORIO/'
export default defineConfig({
  plugins: [react()],
  base: '/almoxarifado-ti/',
})
