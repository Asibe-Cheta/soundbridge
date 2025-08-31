'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Avatar,
  AvatarImage,
  AvatarFallback,
  MusicCard,
  CreatorCard,
  EventCard,
  Toaster,
  toast
} from '@/src/components/ui';
import { 
  Play, 
  Heart, 
  Share2, 
  MoreHorizontal, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  Menu,
  Music,
  Calendar,
  MapPin
} from 'lucide-react';

export default function UIDemoPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        toast.success('Operation completed successfully!');
        break;
      case 'error':
        toast.error('Something went wrong!');
        break;
      case 'warning':
        toast.warning('Please check your input!');
        break;
      case 'info':
        toast.info('Here is some information!');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary p-8">
      <Toaster />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-12"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-red to-accent-pink bg-clip-text text-transparent">
            SoundBridge UI Components
          </h1>
          <p className="text-white/60 text-lg">
            Modern glassmorphism design system with enhanced animations
          </p>
        </div>

        {/* Button Variants */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Button Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="default">Primary</Button>
              <Button variant="outline">Glass</Button>
              <Button variant="secondary">Gradient</Button>
              <Button variant="ghost">Glassmorphism</Button>
              <Button variant="destructive">Neon</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
              <Button size="icon"><Play className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Card Variants */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Card Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant="glass" className="p-6">
                <CardTitle>Glass Card</CardTitle>
                <p className="text-white/60 mt-2">Beautiful glassmorphism effect</p>
              </Card>
              
              <Card variant="elevated" className="p-6">
                <CardTitle>Elevated Card</CardTitle>
                <p className="text-white/60 mt-2">Enhanced depth and shadow</p>
              </Card>
              
              <Card variant="gradient" className="p-6">
                <CardTitle>Gradient Card</CardTitle>
                <p className="text-white/60 mt-2">Colorful gradient background</p>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Dialog Component</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Welcome to SoundBridge</DialogTitle>
                  <DialogDescription>
                    This is a beautiful glassmorphism dialog with enhanced styling and animations.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-white/80">
                    The dialog component features backdrop blur, smooth animations, and maintains the 
                    SoundBridge design aesthetic throughout.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="default" onClick={() => setIsDialogOpen(false)}>
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Sheet Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Sheet Component</CardTitle>
          </CardHeader>
          <CardContent>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">Open Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings Panel</SheetTitle>
                  <SheetDescription>
                    Access your account settings and preferences here.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback>SB</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">SoundBridge User</p>
                      <p className="text-white/60 text-sm">user@soundbridge.com</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Preferences
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-400">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
                <SheetFooter>
                  <Button variant="default" onClick={() => setIsSheetOpen(false)}>
                    Close
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        {/* Tabs Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Tabs Component</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="music" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="music">Music</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="creators">Creators</TabsTrigger>
              </TabsList>
              <TabsContent value="music" className="mt-6">
                <Card variant="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Music className="w-8 h-8 text-primary-red" />
                      <div>
                        <h3 className="text-white font-semibold">Music Library</h3>
                        <p className="text-white/60">Browse and discover new tracks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="events" className="mt-6">
                <Card variant="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Calendar className="w-8 h-8 text-accent-pink" />
                      <div>
                        <h3 className="text-white font-semibold">Live Events</h3>
                        <p className="text-white/60">Find upcoming concerts and shows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="creators" className="mt-6">
                <Card variant="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <User className="w-8 h-8 text-coral" />
                      <div>
                        <h3 className="text-white font-semibold">Artists & Creators</h3>
                        <p className="text-white/60">Connect with talented musicians</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dropdown Menu Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Dropdown Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Heart className="w-4 h-4 mr-2" />
                    Like
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    More Options
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Help</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-400">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Avatar Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>SB</AvatarFallback>
              </Avatar>
              <Avatar className="w-12 h-12">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Avatar className="w-10 h-10">
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
              <Avatar className="w-8 h-8">
                <AvatarFallback>CD</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>

        {/* Toast Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Toast Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="default" onClick={() => handleToast('success')}>
                Success Toast
              </Button>
              <Button variant="destructive" onClick={() => handleToast('error')}>
                Error Toast
              </Button>
              <Button variant="outline" onClick={() => handleToast('warning')}>
                Warning Toast
              </Button>
              <Button variant="ghost" onClick={() => handleToast('info')}>
                Info Toast
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Specialized Cards Demo */}
        <Card variant="glass" className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Specialized Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Music Cards */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Music Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MusicCard
                  id="1"
                  title="Midnight Dreams"
                  artist="Luna Echo"
                  duration={180}
                  playCount={12500}
                  onPlay={(id) => console.log('Playing:', id)}
                  onLike={(id) => console.log('Liked:', id)}
                  onShare={(id) => console.log('Shared:', id)}
                  onMore={(id) => console.log('More:', id)}
                />
                <MusicCard
                  id="2"
                  title="Electric Soul"
                  artist="Neon Pulse"
                  duration={240}
                  playCount={8900}
                  isLiked={true}
                  onPlay={(id) => console.log('Playing:', id)}
                  onLike={(id) => console.log('Liked:', id)}
                  onShare={(id) => console.log('Shared:', id)}
                  onMore={(id) => console.log('More:', id)}
                />
              </div>
            </div>

            {/* Creator Cards */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Creator Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CreatorCard
                  id="1"
                  name="Luna Echo"
                  username="lunaecho"
                  followerCount={12500}
                  trackCount={24}
                  location="London, UK"
                  isVerified={true}
                  onFollow={(id) => console.log('Follow:', id)}
                  onClick={(id) => console.log('Click:', id)}
                />
                <CreatorCard
                  id="2"
                  name="Neon Pulse"
                  username="neonpulse"
                  followerCount={8900}
                  trackCount={18}
                  location="Berlin, DE"
                  isFollowing={true}
                  onFollow={(id) => console.log('Follow:', id)}
                  onClick={(id) => console.log('Click:', id)}
                />
              </div>
            </div>

            {/* Event Cards */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Event Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <EventCard
                  id="1"
                  title="Summer Music Festival 2024"
                  date="2024-07-15"
                  location="Hyde Park, London"
                  price={45}
                  currency="GBP"
                  attendeeCount={1200}
                  maxAttendees={2000}
                  category="Festival"
                  isFeatured={true}
                  rating={4.8}
                  onRSVP={(id) => console.log('RSVP:', id)}
                  onClick={(id) => console.log('Click:', id)}
                />
                <EventCard
                  id="2"
                  title="Underground Techno Night"
                  date="2024-06-22"
                  location="Warehouse Club, Berlin"
                  price={25}
                  currency="EUR"
                  attendeeCount={180}
                  maxAttendees={200}
                  category="Club Night"
                  isAttending={true}
                  onRSVP={(id) => console.log('RSVP:', id)}
                  onClick={(id) => console.log('Click:', id)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
