/**
 * AnnotationCanvas Component
 * Canvas for drawing yellow marker annotations on screenshots
 * Uses react-sketch-canvas for drawing functionality
 * Implements: User Feedback System
 */
'use client';

import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslations } from 'next-intl';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import {
  PencilIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

// Default marker settings
const DEFAULT_MARKER_COLOR = '#FCD34D'; // yellow
const MARKER_WIDTH = 3;

const COLOR_OPTIONS: { color: string; key: string }[] = [
  { color: '#FCD34D', key: 'yellow' },
  { color: '#EF4444', key: 'red' },
  { color: '#3B82F6', key: 'blue' },
];

export interface AnnotationCanvasRef {
  exportImage: () => Promise<string>;
  exportPaths: () => Promise<any[]>;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

interface AnnotationCanvasProps {
  backgroundImage: string;
  width: number;
  height: number;
  onComplete: (imageBase64: string, paths: any[]) => void;
  onCancel: () => void;
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
  function AnnotationCanvas({ backgroundImage, width, height, onComplete, onCancel }, ref) {
    const canvasRef = useRef<ReactSketchCanvasRef>(null);
    const [strokeWidth, setStrokeWidth] = useState(MARKER_WIDTH);
    const [strokeColor, setStrokeColor] = useState<string>(DEFAULT_MARKER_COLOR);
    const [isExporting, setIsExporting] = useState(false);
    const t = useTranslations('feedback');
    const tCommon = useTranslations('common');
    
    // Calculate scaled dimensions to fit in viewport
    const maxWidth = Math.min(window.innerWidth - 48, 800);
    const maxHeight = Math.min(window.innerHeight - 200, 600);
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    const handleUndo = useCallback(() => {
      canvasRef.current?.undo();
    }, []);
    
    const handleRedo = useCallback(() => {
      canvasRef.current?.redo();
    }, []);
    
    const handleClear = useCallback(() => {
      canvasRef.current?.clearCanvas();
    }, []);
    
    const handleExport = useCallback(async () => {
      if (!canvasRef.current || isExporting) return;
      
      setIsExporting(true);
      try {
        // Export as PNG image
        const imageBase64 = await canvasRef.current.exportImage('png');
        
        // Export paths for JSON storage
        const paths = await canvasRef.current.exportPaths();
        
        onComplete(imageBase64, paths);
      } catch (error) {
        console.error('Export error:', error);
      } finally {
        setIsExporting(false);
      }
    }, [onComplete, isExporting]);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      exportImage: async () => {
        return canvasRef.current?.exportImage('png') || '';
      },
      exportPaths: async () => {
        return canvasRef.current?.exportPaths() || [];
      },
      undo: handleUndo,
      redo: handleRedo,
      clear: handleClear,
    }), [handleUndo, handleRedo, handleClear]);
    
    return (
      <div className="flex flex-col items-center">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
          {/* Pencil indicator + color picker */}
            <div className="flex items-center gap-2 px-3 py-1 rounded text-sm">
            <div className="flex items-center gap-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-300">
              <PencilIcon className="h-4 w-4" />
              <span className="text-sm">{t('annotate.pen')}</span>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.color}
                  onClick={() => setStrokeColor(opt.color)}
                  title={t(`annotate.colors.${opt.key}`)}
                  aria-label={t('annotate.selectColor', { color: t(`annotate.colors.${opt.key}`) })}
                  className={`w-6 h-6 rounded-full border-2 ${strokeColor === opt.color ? 'ring-2 ring-offset-1 ring-primary-500' : 'border-gray-200'} transition-colors`}
                  style={{ backgroundColor: opt.color }}
                />
              ))}
            </div>
          </div>
          
          {/* Stroke width */}
            <div className="flex items-center gap-1 border-l border-gray-300 dark:border-slate-600 pl-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('annotate.thickness')}</span>
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
            >
              <option value={2}>{t('annotate.thin')}</option>
              <option value={3}>{t('annotate.medium')}</option>
              <option value={5}>{t('annotate.thick')}</option>
              <option value={8}>{t('annotate.extraThick')}</option>
            </select>
          </div>
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-l border-gray-300 dark:border-slate-600 pl-2">
            <button
              onClick={handleUndo}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
              title={t('annotate.undo')}
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
              title={t('annotate.redo')}
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              title={t('annotate.clear')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Canvas with background image */}
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden max-w-full"
          style={{ width: scaledWidth, height: scaledHeight, maxWidth: '90vw' }}
        >
          <ReactSketchCanvas
            ref={canvasRef}
            width={`${scaledWidth}px`}
            height={`${scaledHeight}px`}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            canvasColor="transparent"
            backgroundImage={backgroundImage}
            exportWithBackgroundImage={true}
            style={{
              borderRadius: '0.375rem',
            }}
          />
        </div>
        
        {/* Instructions */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
          {t('annotate.description')}
        </p>
        
        {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
                {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>{tCommon('processing')}</span>
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>{t('annotate.confirm')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
);

export default AnnotationCanvas;
