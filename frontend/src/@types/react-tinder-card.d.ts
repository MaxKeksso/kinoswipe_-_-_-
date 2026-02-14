declare module 'react-tinder-card' {
  import { ReactNode } from 'react';

  export interface TinderCardProps {
    ref?: React.Ref<any>;
    className?: string;
    preventSwipe?: ('up' | 'down' | 'left' | 'right')[];
    onSwipe?: (direction: string) => void;
    onCardLeftScreen?: (direction: string) => void;
    children?: ReactNode;
  }

  export default function TinderCard(props: TinderCardProps): JSX.Element;
}

