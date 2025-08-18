import { useAuth } from './useAuth';

export const useRoleAccess = () => {
  const { profile } = useAuth();

  const isAdmin = () => profile?.role === 'admin';
  const isMR = () => profile?.role === 'mr';
  
  const canManageProducts = () => isAdmin();
  const canManageAllOrders = () => isAdmin();
  const canManageAllUsers = () => isAdmin();
  const canApproveExpenses = () => isAdmin();
  const canDeleteOrders = () => isAdmin();
  
  const canViewOwnData = () => Boolean(profile);
  const canCreateOrders = () => Boolean(profile);
  const canCreateExpenses = () => isMR();
  
  return {
    isAdmin: isAdmin(),
    isMR: isMR(),
    canManageProducts: canManageProducts(),
    canManageAllOrders: canManageAllOrders(),
    canManageAllUsers: canManageAllUsers(),
    canApproveExpenses: canApproveExpenses(),
    canDeleteOrders: canDeleteOrders(),
    canViewOwnData: canViewOwnData(),
    canCreateOrders: canCreateOrders(),
    canCreateExpenses: canCreateExpenses(),
  };
};