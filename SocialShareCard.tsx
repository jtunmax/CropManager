import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Share2, Download, Facebook, Copy, Check, TreePine, Leaf, Sparkles, MessageCircle, Instagram } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ImpactStats {
  totalTrees: number;
  co2Offset: number;
  carsOffset: number;
  oxygenProduced: number;
  fruitTrees: number;
  nativeTrees: number;
  uniquePlanters: number;
}

interface SocialShareCardProps {
  stats: ImpactStats;
}

export function SocialShareCard({ stats }: SocialShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const shareText = `🌳 Our community has planted ${stats.totalTrees} trees!\n\n🌿 ${(stats.co2Offset / 1000).toFixed(1)} tonnes of CO₂ offset per year\n🚗 Equivalent to taking ${stats.carsOffset.toFixed(1)} cars off the road\n💨 Producing oxygen for ${Math.round(stats.oxygenProduced / 740)} people\n\nJoin us in making Belize greener! #TreeTracker #Belize #ClimateAction`;

  const shareUrl = window.location.origin;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied to clipboard!',
        description: 'Share your impact on social media',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
  };

  const handleFacebookShare = () => {
    const fbUrl = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${fbUrl}`, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a direct share URL, so copy text for the user
    handleCopyText();
    toast({
      title: 'Text copied!',
      description: 'Paste it as your Instagram caption. Open Instagram to share your impact!',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share Impact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Community's Impact
          </DialogTitle>
        </DialogHeader>
        
        {/* Preview Card */}
        <div 
          ref={cardRef}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-forest-light to-moss p-6 text-primary-foreground"
        >
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <TreePine className="w-20 h-20" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-10">
            <Leaf className="w-16 h-16" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <TreePine className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg">Tree Tracker Belize</p>
                <p className="text-xs opacity-80">Community Impact Report</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-3xl font-bold">{stats.totalTrees}</p>
                <p className="text-xs opacity-80">Trees Planted</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-3xl font-bold">{(stats.co2Offset / 1000).toFixed(1)}t</p>
                <p className="text-xs opacity-80">CO₂ Offset/Year</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm bg-white/10 rounded-lg px-3 py-2">
              <Sparkles className="w-4 h-4" />
              <span>≈ {stats.carsOffset.toFixed(1)} cars off the road per year</span>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={handleWhatsAppShare}
          >
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={handleFacebookShare}
          >
            <Facebook className="w-5 h-5 text-[#4267B2]" />
            <span className="text-xs">Facebook</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={handleInstagramShare}
          >
            <Instagram className="w-5 h-5 text-[#E4405F]" />
            <span className="text-xs">Instagram</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={handleCopyText}
          >
            {copied ? (
              <Check className="w-5 h-5 text-primary" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
            <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
          </Button>
        </div>

        {/* Share message preview */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground whitespace-pre-line">{shareText}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
