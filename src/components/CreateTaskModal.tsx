import { useState } from 'react';
import { Button } from './ui/button';
import { CreateTaskForm } from './CreateTaskForm';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export function CreateTaskModal({ isOpen, onClose, defaultProjectId }: CreateTaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CreateTaskForm 
          onClose={onClose}
          onSuccess={() => {
            console.log('Task created successfully!');
          }}
          defaultProjectId={defaultProjectId}
        />
      </div>
    </div>
  );
}

// Simple trigger button component
interface CreateTaskButtonProps {
  defaultProjectId?: string;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function CreateTaskButton({ 
  defaultProjectId, 
  variant = 'primary',
  size = 'default',
  className 
}: CreateTaskButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant={variant === 'outline' ? 'outline' : 'default'}
        size={size}
        className={className}
      >
        + Create Task
      </Button>
      
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}