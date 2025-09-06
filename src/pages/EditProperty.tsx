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
import { Upload, X, ArrowLeft } from 'lucide-react';

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');

  const predefinedAmenities = [
    'Piscina', 'Academia', 'Churrasqueira', 'Playground', 'Salão de Festas',
    'Portaria 24h', 'Elevador', 'Garagem', 'Jardim', 'Varanda',
    'Ar Condicionado', 'Armários', 'Cozinha Planejada'
  ];

  useEffect(() => {
    if (user && id) {
      fetchProperty();
    }
  }, [user, id]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Imóvel não encontrado');

      setProperty(data);
      setExistingImages(data.images || []);
      setAmenities(data.amenities || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar imóvel",
        description: error.message,
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + selectedImages.length + files.length;
    if (totalImages > 20) {
      toast({
        title: "Limite excedido",
        description: "Máximo de 20 imagens por imóvel",
        variant: "destructive",
      });
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeNewImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(url => url !== imageUrl));
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
      const formData = new FormData(e.currentTarget);
      
      // Upload new images if any
      let newImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        newImageUrls = await uploadImages(property.id);
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newImageUrls];

      // Update the property
      const { error } = await supabase
        .from('properties')
        .update({
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          price: parseFloat(formData.get('price') as string),
          location: formData.get('location') as string,
          property_type: formData.get('property_type') as string,
          purpose: formData.get('purpose') as string,
          bedrooms: parseInt(formData.get('bedrooms') as string) || null,
          bathrooms: parseInt(formData.get('bathrooms') as string) || null,
          parking_spaces: parseInt(formData.get('parking_spaces') as string) || null,
          area: parseFloat(formData.get('area') as string) || null,
          amenities,
          images: allImages,
          status: formData.get('status') as string,
        })
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Imóvel atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar imóvel",
        description: error.message,
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
                    type="number"
                    step="0.01"
                    defaultValue={property.price}
                    required
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

              {/* Property Type and Purpose */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Imóvel *</Label>
                  <Select name="property_type" defaultValue={property.property_type} required>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Select name="purpose" defaultValue={property.purpose} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Aluguel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select name="status" defaultValue={property.status} required>
                    <SelectTrigger>
                      <SelectValue />
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
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={property.area || ''}
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

              {/* Image Management */}
              <div className="space-y-4">
                <Label>Fotos do Imóvel</Label>
                
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Imagens Atuais</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {existingImages.map((imageUrl, index) => (
                        <div key={index} className="relative">
                          <img
                            src={imageUrl}
                            alt={`Imagem ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(imageUrl)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Images */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="text-sm text-muted-foreground mb-4">
                      Adicionar novas imagens (máximo 20 fotos total)
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button type="button" variant="outline" asChild>
                        <span>Selecionar Imagens</span>
                      </Button>
                    </label>
                  </div>
                </div>

                {selectedImages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Novas Imagens</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Nova imagem ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
