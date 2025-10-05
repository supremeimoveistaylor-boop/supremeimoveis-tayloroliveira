import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { 
  sanitizeInput, 
  sanitizeUrl, 
  validatePrice, 
  validateArea, 
  validateRoomCount, 
  sanitizeImageArray, 
  sanitizeAmenitiesArray,
  sanitizeErrorMessage,
  validateImageFile
} from '@/lib/security';

const AddProperty = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authenticated
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');

  const predefinedAmenities = [
    'Piscina', 'Academia', 'Churrasqueira', 'Playground', 'Salão de Festas',
    'Portaria 24h', 'Elevador', 'Garagem', 'Jardim', 'Varanda',
    'Ar Condicionado', 'Armários', 'Cozinha Planejada'
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleImageUpload = (files: File[]) => {
    // Security: Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!validateImageFile(file)) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é um tipo de imagem válido ou é muito grande (máximo 5MB)`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    
    if (selectedImages.length + validFiles.length > 20) {
      toast({
        title: "Limite excedido",
        description: "Máximo de 20 imagens por imóvel",
        variant: "destructive",
      });
      return;
    }
    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const addAmenity = (amenity: string) => {
    if (amenity && !amenities.includes(amenity)) {
      setAmenities(prev => [...prev, amenity]);
    }
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(prev => prev.filter(a => a !== amenity));
  };

  const uploadImages = async (propertyId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}-${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Ensure user is authenticated
      if (!user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para cadastrar um imóvel.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const formData = new FormData(e.currentTarget);
      
      // Security: Sanitize and validate all inputs
      const title = sanitizeInput(formData.get('title') as string);
      const description = sanitizeInput(formData.get('description') as string);
      const location = sanitizeInput(formData.get('location') as string);
      const priceValue = parseFloat(formData.get('price')?.toString().replace(/[^\d,]/g, '').replace(/,/g, '.') || '0');
      const areaValue = parseFloat(formData.get('area')?.toString().replace(/,/g, '.') || '0') || null;
      const bedroomsValue = parseInt(formData.get('bedrooms') as string) || null;
      const bathroomsValue = parseInt(formData.get('bathrooms') as string) || null;
      const parkingValue = parseInt(formData.get('parking_spaces') as string) || null;
      const whatsappLink = sanitizeUrl(formData.get('whatsapp_link') as string);
      const youtubeLink = sanitizeUrl(formData.get('youtube_link') as string);

      // Validate inputs
      if (!title || title.length < 5 || title.length > 200) {
        toast({
          title: "Título inválido",
          description: "O título deve ter entre 5 e 200 caracteres.",
          variant: "destructive",
        });
        return;
      }

      if (!validatePrice(priceValue)) {
        toast({
          title: "Preço inválido",
          description: "O preço deve ser um valor positivo válido.",
          variant: "destructive",
        });
        return;
      }

      if (!validateArea(areaValue)) {
        toast({
          title: "Área inválida",
          description: "A área deve ser um valor positivo válido.",
          variant: "destructive",
        });
        return;
      }

      if (!propertyType || !purpose) {
        toast({
          title: "Selecione tipo e finalidade",
          description: "Escolha o tipo de imóvel e a finalidade.",
          variant: "destructive",
        });
        return;
      }

      if (title && location) {
        // noop just to satisfy type narrowing
      }

      if (!validateRoomCount(bedroomsValue) || !validateRoomCount(bathroomsValue) || !validateRoomCount(parkingValue)) {
        toast({
          title: "Dados inválidos",
          description: "Verifique os valores de quartos, banheiros e vagas de garagem.",
          variant: "destructive",
        });
        return;
      }

      // First, create the property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          user_id: user.id,
          title,
          description,
          price: priceValue,
          location,
          property_type: propertyType,
          purpose: purpose,
          bedrooms: bedroomsValue,
          bathrooms: bathroomsValue,
          parking_spaces: parkingValue,
          area: areaValue,
          amenities: sanitizeAmenitiesArray(amenities),
          images: [], // Will be updated after image upload
          whatsapp_link: whatsappLink,
          youtube_link: youtubeLink,
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Upload images if any
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(property.id);
        
        // Update property with image URLs
        const { error: updateError } = await supabase
          .from('properties')
          .update({ images: imageUrls })
          .eq('id', property.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Imóvel cadastrado!",
        description: "Seu imóvel foi cadastrado com sucesso.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Property creation error:', error);
      toast({
        title: "Erro ao cadastrar imóvel",
        description: sanitizeErrorMessage(error),
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
              <h1 className="text-2xl font-bold">Adicionar Imóvel</h1>
              <p className="text-muted-foreground">Cadastre um novo imóvel</p>
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
                    placeholder="Ex: Casa com 3 quartos no centro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="text"
                    placeholder="Ex: R$ 350.000,00"
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
                  placeholder="Descreva o imóvel..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização *</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Ex: Centro, Patos de Minas - MG"
                    required
                  />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_link">Link do WhatsApp</Label>
                <Input
                  id="whatsapp_link"
                  name="whatsapp_link"
                  type="url"
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
                  placeholder="Ex: https://youtube.com/watch?v=..."
                />
                <p className="text-sm text-muted-foreground">
                  Cole o link do vídeo do YouTube do imóvel (opcional)
                </p>
              </div>

              {/* Property Type and Purpose */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parking_spaces">Vagas</Label>
                  <Input
                    id="parking_spaces"
                    name="parking_spaces"
                    type="number"
                    min="0"
                    placeholder="0"
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
                    placeholder="Ex: 250,50"
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

              {/* Image Upload with Drag and Drop */}
              <DraggableImageGallery
                images={selectedImages as Array<File | string>}
                onImagesChange={(images) => setSelectedImages(images.filter(img => img instanceof File) as File[])}
                onImageUpload={handleImageUpload}
                maxImages={20}
                existingLabel="Fotos do Imóvel"
                newLabel="Selecionar Imagens"
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
                  {isLoading ? "Cadastrando..." : "Cadastrar Imóvel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddProperty;