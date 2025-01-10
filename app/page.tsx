// app/page.tsx
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Remove dark mode since we're using brand colors */}
      <ChatInterface />
    </main>
  );
}