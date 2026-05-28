import { redirect } from 'next/navigation';

export default function AdminVendorsRoot() {
  redirect('/admin/vendors/manage');
}
