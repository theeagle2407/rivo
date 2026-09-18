export function RivoLogo({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="Rivo"><svg className="brand-mark" viewBox="0 0 42 42" aria-hidden="true"><path d="M7 7h13.5C29 7 34 11.7 34 18.6c0 5.2-2.8 9.1-7.7 10.9L35 35H24.7l-7.6-6.4v-6.3h3.2c3.2 0 5.1-1.3 5.1-3.7 0-2.3-1.9-3.5-5.1-3.5h-5V35H7V7Z"/><path className="brand-flow" d="M29.6 7H38l-5.3 8.7h-8.4L29.6 7Z"/></svg>{!compact && <span>Rivo</span>}</span>;
}
