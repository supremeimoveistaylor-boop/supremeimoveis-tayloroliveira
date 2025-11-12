import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { X, ArrowLeft } from 'lucide-react';
import { DraggableImageGallery } from '@/components/DraggableImageGallery';
import { validateImageFile } from '@/lib/security';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  purpose: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  area: number;
  images: string[];
  amenities: string[];
  status: string;
}

const EditProperty = () => {
  // All hooks must be called before any conditional returns
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [allImages, setAllImages] = useState<Array<File | string>>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [status, setStatus] = useState<string>('active');

  const predefinedAmenities = [
    'Piscina', 'Academia', 'Churrasqueira', 'Playground', 'Salão de Festas',
    'Portaria 24h', 'Elevador', 'Garagem', 'Jardim', 'Varanda',
    'Ar Condicionado', 'Armários', 'Cozinha Planejada'
  ];

  useEffect(() => {
    if (id && user) {
      fetchProperty();
    }
  }, [id, user]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const fetchProperty = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Imóvel não encontrado');

      setProperty(data);
      setAllImages(data.images || []);
      setAmenities(data.amenities || []);
      setPropertyType(data.property_type);
      setPurpose(data.purpose);
      setStatus(data.status || 'active');
    } catch (error: any) {
      toast({
        title: "Erro ao carregar imóvel",
        description: error.message,
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleImageUpload = (files: File[]) => {
    console.log(`Processing ${files.length} files for upload`);
    
    // Security: Validate file types and sizes
    const validFiles: File[] = [];
    let hasInvalidFiles = false;
    
    for (const file of files) {
      if (!validateImageFile(file)) {
        hasInvalidFiles = true;
        console.warn(`Invalid file: ${file.name}`);
      } else {
        validFiles.push(file);
      }
    }
    
    if (hasInvalidFiles) {
      toast({
        title: "Alguns arquivos foram ignorados",
        description: "Apenas imagens JPG, PNG e WEBP com até 5MB são aceitas",
        variant: "destructive",
      });
    }
    
    const remainingSlots = 20 - allImages.length;
    
    if (validFiles.length > remainingSlots) {
      toast({
        title: "Limite excedido",
        description: `Máximo de 20 imagens. Adicionando apenas ${remainingSlots} foto(s).`,
        variant: "destructive",
      });
    }
    
    const filesToAdd = validFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length > 0) {
      console.log(`Adding ${filesToAdd.length} valid files`);
      setAllImages(prev => [...prev, ...filesToAdd]);
      toast({
        title: "Fotos adicionadas",
        description: `${filesToAdd.length} foto(s) adicionada(s) com sucesso`,
      });
    }
  };

  const addAmenity = (amenity: string) => {
    if (amenity && !amenities.includes(amenity)) {
      setAmenities(prev => [...prev, amenity]);
    }
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(prev => prev.filter(a => a !== amenity));
  };

  const uploadImages = async (propertyId: string, newFiles: File[]): Promise<string[]> => {
    console.log(`🚀 UPLOAD: Iniciando envio de ${newFiles.length} novas imagens`);
    console.log(`🔑 Auth user:`, user?.id);
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`🔐 Session exists:`, !!session);
    
    if (!session) {
      console.error('❌ Usuário não autenticado!');
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para fazer upload de imagens.",
        variant: "destructive",
      });
      return [];
    }
    
    // Upload in parallel batches of 5 for better performance
    const BATCH_SIZE = 5;
    const uploadedUrls: string[] = [];
    
    for (let batchStart = 0; batchStart < newFiles.length; batchStart += BATCH_SIZE) {
      const batch = newFiles.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newFiles.length / BATCH_SIZE);
      
      console.log(`\n📦 Lote ${batchNum}/${totalBatches} (${batch.length} imagens)`);
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = batchStart + batchIndex;
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const fileName = `${propertyId}/${timestamp}_${random}_${globalIndex}.${fileExt}`;

        try {
          console.log(`📷 [${globalIndex + 1}/${newFiles.length}] Iniciando: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          console.log(`📂 Nome do arquivo: ${fileName}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`❌ [${globalIndex + 1}] Erro no upload:`, {
              message: uploadError.message,
              error: uploadError,
            });
            return null;
          }

          console.log(`✅ [${globalIndex + 1}] Upload OK, gerando URL pública`);
          
          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          console.log(`🌐 [${globalIndex + 1}] URL gerada: ${urlData.publicUrl}`);
          return urlData.publicUrl;
        } catch (error: any) {
          console.error(`💥 [${globalIndex + 1}] Exceção capturada:`, {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const successfulUrls = batchResults.filter((url): url is string => url !== null);
      uploadedUrls.push(...successfulUrls);
      
      console.log(`✅ Lote ${batchNum}: ${successfulUrls.length}/${batch.length} OK`);
    }

    console.log(`\n📊 RESULTADO FINAL: ${uploadedUrls.length}/${newFiles.length} imagens enviadas`);
    console.log(`📋 URLs geradas:`, uploadedUrls);
    
    if (uploadedUrls.length === 0 && newFiles.length > 0) {
      toast({
        title: "Erro completo",
        description: "Nenhuma imagem foi enviada. Verifique os logs do console para mais detalhes.",
        variant: "destructive",
      });
    } else if (uploadedUrls.length < newFiles.length) {
      toast({
        title: "Upload parcial",
        description: `${uploadedUrls.length} de ${newFiles.length} imagens enviadas.`,
      });
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      console.log('Atualizando imóvel:', property.id);
      console.log('Total de imagens:', allImages.length);
      
      // Separate existing URLs from new files
      const existingUrls = allImages.filter(img => typeof img === 'string') as string[];
      const newFiles = allImages.filter(img => img instanceof File) as File[];
      
      console.log('Imagens existentes:', existingUrls.length);
      console.log('Novos arquivos:', newFiles.length);
      
      // Upload new images if any
      let newImageUrls: string[] = [];
      if (newFiles.length > 0) {
        console.log('Iniciando upload de novas imagens...');
        try {
          newImageUrls = await uploadImages(property.id, newFiles);
          console.log('Upload concluído:', newImageUrls.length, 'URLs');
        } catch (uploadError) {
          console.error('Erro durante o upload:', uploadError);
          throw new Error('Erro ao fazer upload das imagens. Tente novamente.');
        }
      }

      // Combine existing and new images in the correct order
      const finalImages = allImages.map(img => {
        if (typeof img === 'string') {
          return img;
        } else {
          // Get the uploaded URL for this file
          return newImageUrls.shift() || '';
        }
      }).filter(url => url !== '');
      
      console.log('Imagens finais:', finalImages.length);

      // Update the property
      const { error } = await supabase
        .from('properties')
        .update({
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          price: parseFloat(formData.get('price')?.toString().replace(/[^\d,]/g, '').replace(/,/g, '.') || '0'),
          location: formData.get('location') as string,
          property_type: propertyType,
          purpose: purpose,
          bedrooms: parseInt(formData.get('bedrooms') as string) || null,
          bathrooms: parseInt(formData.get('bathrooms') as string) || null,
          parking_spaces: parseInt(formData.get('parking_spaces') as string) || null,
          area: parseFloat(formData.get('area')?.toString().replace(/,/g, '.') || '0') || null,
          amenities,
          images: finalImages,
          status: status,
          whatsapp_link: formData.get('whatsapp_link') as string || null,
          youtube_link: formData.get('youtube_link') as string || null,
        } as any)
        .eq('id', property.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        throw error;
      }

      console.log('Imóvel atualizado com sucesso');

      toast({
        title: "Imóvel atualizado!",
        description: `As alterações foram salvas com sucesso${finalImages.length > 0 ? ` com ${finalImages.length} foto(s)` : ''}.`,
      });

      // Navigate immediately after save
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao atualizar imóvel:', error);
      toast({
        title: "Erro ao atualizar imóvel",
        description: error?.message || "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Editar Imóvel</h1>
              <p className="text-muted-foreground">Altere as informações do imóvel</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={property.title}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="text"
                    defaultValue={new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(property.price)}
                    required
                    onChange={(e) => {
                      // Remove all non-digits
                      let value = e.target.value.replace(/\D/g, '');
                      if (value) {
                        // Convert to number and format as Brazilian currency
                        const numValue = parseFloat(value) / 100;
                        const formatted = new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(numValue);
                        e.target.value = formatted;
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={property.description || ''}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização *</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={property.location}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_link">Link do WhatsApp</Label>
                <Input
                  id="whatsapp_link"
                  name="whatsapp_link"
                  type="url"
                  defaultValue={(property as any).whatsapp_link || ''}
                  placeholder="Ex: https://wa.me/5534999887766"
                />
                <p className="text-sm text-muted-foreground">
                  Cole o link do seu WhatsApp para facilitar o contato dos clientes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube_link">Vídeo do YouTube</Label>
                <Input
                  id="youtube_link"
                  name="youtube_link"
                  type="url"
                  defaultValue={(property as any).youtube_link || ''}
                  placeholder="Ex: https://youtube.com/watch?v=..."
                />
                <p className="text-sm text-muted-foreground">
                  Cole o link do vídeo do YouTube do imóvel (opcional)
                </p>
              </div>

              {/* Property Type and Purpose */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Imóvel *</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Finalidade *</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a finalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Aluguel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="sold">Vendido</SelectItem>
                      <SelectItem value="rented">Alugado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Quartos</Label>
                  <Input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min="0"
                    defaultValue={property.bedrooms || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0"
                    defaultValue={property.bathrooms || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parking_spaces">Vagas</Label>
                  <Input
                    id="parking_spaces"
                    name="parking_spaces"
                    type="number"
                    min="0"
                    defaultValue={property.parking_spaces || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    name="area"
                    type="text"
                    step="0.01"
                    min="0"
                    defaultValue={property.area ? property.area.toString().replace('.', ',') : ''}
                    onChange={(e) => {
                      // Format area input with Brazilian decimal separator
                      let value = e.target.value.replace(/[^\d,]/g, '');
                      if (value.includes(',')) {
                        const parts = value.split(',');
                        if (parts[1] && parts[1].length > 2) {
                          parts[1] = parts[1].substring(0, 2);
                        }
                        value = parts.join(',');
                      }
                      e.target.value = value;
                    }}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <Label>Comodidades</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {predefinedAmenities.map((amenity) => (
                    <Button
                      key={amenity}
                      type="button"
                      variant={amenities.includes(amenity) ? "default" : "outline"}
                      size="sm"
                      onClick={() => 
                        amenities.includes(amenity) 
                          ? removeAmenity(amenity)
                          : addAmenity(amenity)
                      }
                    >
                      {amenity}
                    </Button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar comodidade personalizada"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAmenity(newAmenity);
                        setNewAmenity('');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      addAmenity(newAmenity);
                      setNewAmenity('');
                    }}
                  >
                    Adicionar
                  </Button>
                </div>

                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary">
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Management with Drag and Drop */}
              <DraggableImageGallery
                images={allImages}
                onImagesChange={setAllImages}
                onImageUpload={handleImageUpload}
                maxImages={20}
                existingLabel="Fotos do Imóvel"
                newLabel="Adicionar Imagens"
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditProperty;
