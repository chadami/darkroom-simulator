import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, RotateCcw, Lock, Unlock, ArrowRight } from 'lucide-react';
import { CMYValues } from './types';
import { calculateDelta, formatValue, processImageBuffer } from './utils/colorLogic';
import { FilterChannel } from './components/FilterChannel';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // State for CMY values
  const [initialCMY, setInitialCMY] = useState<CMYValues>({ c: 0, m: 50, y: 50 });
  const [targetCMY, setTargetCMY] = useState<CMYValues>({ c: 0, m: 50, y: 50 });
  
  const [isInitialLocked, setIsInitialLocked] = useState<boolean>(true);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Store the "Base" image data in memory so we don't re-decode constantly.
  // We use a Ref because this data is heavy and doesn't need to trigger re-renders itself.
  const originalImageDataRef = useRef<ImageData | null>(null);

  // Load and prepare the image onto the Canvas
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageSrc(result);
        setIsInitialLocked(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Initialize Canvas when image source changes
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Calculate safe dimensions (limit to 1200px longest side for performance)
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Cache the original pixel data
      originalImageDataRef.current = ctx.getImageData(0, 0, width, height);
      
      // Initial render pass
      applyFilter();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Apply filters whenever CMY values change or toggle original view
  const delta = calculateDelta(initialCMY, targetCMY);

  const applyFilter = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const originalData = originalImageDataRef.current;

    if (!canvas || !ctx || !originalData) return;

    if (showOriginal) {
      // Just put the original data back
      ctx.putImageData(originalData, 0, 0);
      return;
    }

    // Create a new buffer for the modified image
    const outputImage = ctx.createImageData(originalData.width, originalData.height);
    
    // Run the physics simulation
    processImageBuffer(originalData.data, outputImage.data, delta);

    ctx.putImageData(outputImage, 0, 0);
  };

  // Trigger filter application when dependencies change
  useEffect(() => {
    let animationFrameId: number;
    
    // Use requestAnimationFrame for smoother slider dragging
    const render = () => {
      applyFilter();
    };
    
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [delta.c, delta.m, delta.y, showOriginal]);


  const updateInitial = (key: keyof CMYValues, val: number) => {
    const newVal = Math.max(0, Math.min(200, val));
    setInitialCMY((prev) => ({ ...prev, [key]: newVal }));
    setTargetCMY((prev) => ({ ...prev, [key]: newVal }));
  };

  const updateTarget = (key: keyof CMYValues, val: number) => {
    setTargetCMY((prev) => ({ ...prev, [key]: Math.max(0, Math.min(200, val)) }));
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const resetTarget = () => setTargetCMY({ ...initialCMY });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 selection:text-white pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-yellow-500 rounded-lg shadow-inner"></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Darkroom Mate</h1>
            <p className="text-xs text-slate-400">CMY Correction Tool</p>
          </div>
        </div>
        <button 
          onClick={triggerFileUpload}
          className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-full transition-all active:scale-95 border border-slate-700"
          title="Upload Photo"
        >
          <Camera size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Image Preview */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative group bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-[4/5] md:aspect-square lg:aspect-[4/3] flex items-center justify-center">
            
            {/* Placeholder state */}
            {!imageSrc && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4" onClick={triggerFileUpload}>
                <div className="p-6 rounded-full bg-slate-900/50 border border-slate-800 group-hover:bg-slate-800/80 transition-colors cursor-pointer">
                  <Upload size={48} className="text-slate-600 group-hover:text-slate-400" />
                </div>
                <p className="text-lg font-medium">Upload Test Print</p>
                <p className="text-sm opacity-60 max-w-xs text-center">Take a photo of your test strip under neutral light.</p>
              </div>
            )}

            {/* Canvas Element */}
            <canvas 
              ref={canvasRef}
              className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${!imageSrc ? 'hidden' : 'block'}`}
            />
            
            {/* Compare Button */}
            {imageSrc && (
              <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                  <button
                      onMouseDown={() => setShowOriginal(true)}
                      onMouseUp={() => setShowOriginal(false)}
                      onTouchStart={() => setShowOriginal(true)}
                      onTouchEnd={() => setShowOriginal(false)}
                      className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10 hover:bg-black/80 transition-all select-none active:scale-95"
                  >
                      Hold to Compare
                  </button>
              </div>
            )}
          </div>

          {/* Delta Indicators */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 text-center ${delta.c !== 0 ? 'border-cyan-500/30 bg-cyan-950/20' : ''}`}>
               <span className="block text-xs text-slate-400 uppercase tracking-wider">Cyan</span>
               <span className={`text-xl font-bold font-mono ${delta.c > 0 ? 'text-cyan-400' : delta.c < 0 ? 'text-red-400' : 'text-slate-600'}`}>
                 {delta.c > 0 ? '+' : ''}{formatValue(delta.c)}
               </span>
            </div>
            <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 text-center ${delta.m !== 0 ? 'border-fuchsia-500/30 bg-fuchsia-950/20' : ''}`}>
               <span className="block text-xs text-slate-400 uppercase tracking-wider">Magenta</span>
               <span className={`text-xl font-bold font-mono ${delta.m > 0 ? 'text-fuchsia-400' : delta.m < 0 ? 'text-green-400' : 'text-slate-600'}`}>
                 {delta.m > 0 ? '+' : ''}{formatValue(delta.m)}
               </span>
            </div>
            <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 text-center ${delta.y !== 0 ? 'border-yellow-500/30 bg-yellow-950/20' : ''}`}>
               <span className="block text-xs text-slate-400 uppercase tracking-wider">Yellow</span>
               <span className={`text-xl font-bold font-mono ${delta.y > 0 ? 'text-yellow-400' : delta.y < 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                 {delta.y > 0 ? '+' : ''}{formatValue(delta.y)}
               </span>
            </div>
          </div>
        </section>

        {/* Right Column: Controls */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Workflow Tabs */}
          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
             <button 
               onClick={() => setIsInitialLocked(false)}
               className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${!isInitialLocked ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <Unlock size={14} /> Set Base
             </button>
             <div className="flex items-center px-2 text-slate-600">
                <ArrowRight size={16} />
             </div>
             <button 
               onClick={() => setIsInitialLocked(true)}
               className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${isInitialLocked ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <Lock size={14} /> Adjust Color
             </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                    {isInitialLocked ? 'New Filter Pack' : 'Current Settings'}
                </h2>
                {isInitialLocked && (
                    <button 
                        onClick={resetTarget}
                        className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        <RotateCcw size={12} /> Reset to Base
                    </button>
                )}
            </div>

            {/* Main CMY Controls */}
            <div className="space-y-4">
              <FilterChannel
                label="Cyan"
                colorClass="text-cyan-400"
                bgClass="bg-cyan-950/10"
                trackClass="[&::-webkit-slider-thumb]:bg-cyan-500"
                value={isInitialLocked ? targetCMY.c : initialCMY.c}
                onChange={(v) => isInitialLocked ? updateTarget('c', v) : updateInitial('c', v)}
              />
              
              <FilterChannel
                label="Magenta"
                colorClass="text-fuchsia-400"
                bgClass="bg-fuchsia-950/10"
                trackClass="[&::-webkit-slider-thumb]:bg-fuchsia-500"
                value={isInitialLocked ? targetCMY.m : initialCMY.m}
                onChange={(v) => isInitialLocked ? updateTarget('m', v) : updateInitial('m', v)}
              />

              <FilterChannel
                label="Yellow"
                colorClass="text-yellow-400"
                bgClass="bg-yellow-950/10"
                trackClass="[&::-webkit-slider-thumb]:bg-yellow-500"
                value={isInitialLocked ? targetCMY.y : initialCMY.y}
                onChange={(v) => isInitialLocked ? updateTarget('y', v) : updateInitial('y', v)}
              />
            </div>
            
            {/* Contextual Hint */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-sm leading-relaxed text-slate-400">
               {isInitialLocked ? (
                   <>
                    <p className="mb-2"><strong className="text-slate-300">Physics Simulation (Negative to Positive):</strong></p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong className="text-yellow-400">+Y (Yellow Filter)</strong>: Blocks Blue light &rarr; Print is <strong>Bluer</strong>.</li>
                        <li><strong className="text-fuchsia-400">+M (Magenta Filter)</strong>: Blocks Green light &rarr; Print is <strong>Greener</strong>.</li>
                        <li><strong className="text-cyan-400">+C (Cyan Filter)</strong>: Blocks Red light &rarr; Print is <strong>Redder</strong>.</li>
                    </ul>
                   </>
               ) : (
                   <p>Enter the filter values currently set on your enlarger head for the uploaded test print. Click "Adjust Color" when done.</p>
               )}
            </div>

            {/* Base Reference Display (Only when adjusting) */}
            {isInitialLocked && (
                <div className="pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Base Reference</p>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-slate-900 rounded px-3 py-2 border border-slate-800 flex justify-between">
                            <span className="text-cyan-700 font-bold">C</span>
                            <span className="font-mono text-slate-400">{initialCMY.c}</span>
                        </div>
                        <div className="flex-1 bg-slate-900 rounded px-3 py-2 border border-slate-800 flex justify-between">
                            <span className="text-fuchsia-800 font-bold">M</span>
                            <span className="font-mono text-slate-400">{initialCMY.m}</span>
                        </div>
                        <div className="flex-1 bg-slate-900 rounded px-3 py-2 border border-slate-800 flex justify-between">
                            <span className="text-yellow-700 font-bold">Y</span>
                            <span className="font-mono text-slate-400">{initialCMY.y}</span>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
