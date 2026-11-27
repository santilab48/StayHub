import type {NextConfig} from 'next'

const nextConfig:NextConfig={
  serverExternalPackages:['pdfkit'],
  env:{
    NEXT_PUBLIC_ENABLE_AD_MOCK:process.env.RAILWAY_ENVIRONMENT_NAME==='production'?'false':
      process.env.RAILWAY_ENVIRONMENT_NAME==='staging'&&
      process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8'
      ?'true':process.env.NEXT_PUBLIC_ENABLE_AD_MOCK??'false',
  },
}

export default nextConfig
