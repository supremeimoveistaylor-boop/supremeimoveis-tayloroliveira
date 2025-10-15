import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ImageDebuggerProps {
  images: string[];
  propertyTitle: string;
}

export const ImageDebugger = ({ images, propertyTitle }: ImageDebuggerProps) => {
  const [imageStatuses, setImageStatuses] = useState<Record<string, 'loading' | 'success' | 'error'>>({});

  const testImage = (url: string) => {
    return new Promise<'success' | 'error'>((resolve) => {
      const img = new Image();
      img.onload = () => resolve('success');
      img.onerror = () => resolve('error');
      img.src = url;
      
      // Timeout after 10 seconds
      setTimeout(() => resolve('error'), 10000);
    });
  };

  const testAllImages = async () => {
    console.log(`🔍 Testando ${images.length} imagens para: ${propertyTitle}`);
    
    const newStatuses: Record<string, 'loading' | 'success' | 'error'> = {};
    
    for (const url of images) {
      newStatuses[url] = 'loading';
      setImageStatuses({...newStatuses});
      
      const status = await testImage(url);
      newStatuses[url] = status;
      setImageStatuses({...newStatuses});
      
      console.log(`${status === 'success' ? '✅' : '❌'} ${url}`);
    }
  };

  if (!images || images.length === 0) {
    return (
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle className="text-sm">⚠️ {propertyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Sem imagens cadastradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">🖼️  {propertyTitle}</CardTitle>
          <Button size="sm" variant="outline" onClick={testAllImages}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Testar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-2">
          Total: {images.length} imagem(ns)
        </p>
        
        {images.map((url, index) => (
          <div key={index} className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded">
            <div className="flex-shrink-0 w-4">
              {imageStatuses[url] === 'loading' && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {imageStatuses[url] === 'success' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {imageStatuses[url] === 'error' && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] break-all">{url}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
