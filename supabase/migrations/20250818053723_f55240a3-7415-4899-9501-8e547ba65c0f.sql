-- Create enum types for better data integrity
CREATE TYPE user_role AS ENUM ('admin', 'mr');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');

-- Users table (extends auth.users with profile information)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'mr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors table
CREATE TABLE public.doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  area TEXT NOT NULL,
  monthly_target DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pharmacies table
CREATE TABLE public.pharmacies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  mr_id UUID REFERENCES public.users(id),
  order_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  status expense_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Targets table
CREATE TABLE public.targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  mr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_month DATE NOT NULL, -- First day of month
  target_value DECIMAL(10,2) NOT NULL CHECK (target_value >= 0),
  achieved_value DECIMAL(10,2) DEFAULT 0 CHECK (achieved_value >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id, mr_id, target_month)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for doctors
CREATE POLICY "Authenticated users can view doctors" ON public.doctors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert doctors" ON public.doctors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update doctors" ON public.doctors
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete doctors" ON public.doctors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for pharmacies
CREATE POLICY "Authenticated users can view pharmacies" ON public.pharmacies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage pharmacies" ON public.pharmacies
  FOR ALL TO authenticated USING (true);

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for orders
CREATE POLICY "Authenticated users can view orders" ON public.orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "MRs can create orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = mr_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins and order creators can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (
    auth.uid() = mr_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT USING (
    auth.uid() = mr_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "MRs can create their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = mr_id);

CREATE POLICY "MRs can update their pending expenses" ON public.expenses
  FOR UPDATE USING (
    auth.uid() = mr_id AND status = 'pending'
  );

CREATE POLICY "Admins can update all expenses" ON public.expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for targets
CREATE POLICY "Authenticated users can view targets" ON public.targets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage targets" ON public.targets
  FOR ALL TO authenticated USING (true);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'mr')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_targets_updated_at
  BEFORE UPDATE ON public.targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo data
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@winvision.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), NOW(), '{"name": "Admin User", "role": "admin"}'),
  ('550e8400-e29b-41d4-a716-446655440001', 'mr@winvision.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), NOW(), '{"name": "Medical Representative", "role": "mr"}');

-- Insert sample pharmacies
INSERT INTO public.pharmacies (name, address, contact_person, phone) VALUES
  ('City Pharmacy', '123 Main Street, Downtown', 'John Smith', '+1-555-0123'),
  ('HealthCare Pharmacy', '456 Oak Avenue, Uptown', 'Sarah Johnson', '+1-555-0456'),
  ('MediPlus Pharmacy', '789 Pine Road, Suburbs', 'Mike Davis', '+1-555-0789');

-- Insert sample products
INSERT INTO public.products (name, category, price, stock, description) VALUES
  ('Paracetamol 500mg', 'Pain Relief', 12.50, 500, 'Effective pain and fever relief tablets'),
  ('Amoxicillin 250mg', 'Antibiotics', 25.00, 200, 'Broad-spectrum antibiotic capsules'),
  ('Omeprazole 20mg', 'Digestive Health', 18.75, 300, 'Proton pump inhibitor for acid reflux'),
  ('Metformin 500mg', 'Diabetes', 15.00, 400, 'Type 2 diabetes management tablets'),
  ('Lisinopril 10mg', 'Cardiovascular', 22.00, 250, 'ACE inhibitor for blood pressure control');