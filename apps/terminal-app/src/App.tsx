import { useTerminal } from './contexts/TerminalContext';
import SetupScreen from './screens/SetupScreen';
import PinLoginScreen from './screens/PinLoginScreen';
import SalesScreen from './screens/SalesScreen';
import PaymentScreen from './screens/PaymentScreen';
import ConfirmScreen from './screens/ConfirmScreen';
import SuccessScreen from './screens/SuccessScreen';
import VoidScreen from './screens/VoidScreen';

export default function App() {
  const { screen } = useTerminal();

  switch (screen) {
    case 'setup': return <SetupScreen />;
    case 'login': return <PinLoginScreen />;
    case 'sales': return <SalesScreen />;
    case 'payment': return <PaymentScreen />;
    case 'confirm': return <ConfirmScreen />;
    case 'success': return <SuccessScreen />;
    case 'void': return <VoidScreen />;
    default: return <SetupScreen />;
  }
}
