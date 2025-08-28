-- Swift Eats Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create database schema
CREATE SCHEMA IF NOT EXISTS swift_eats;

-- Set search path
SET search_path TO swift_eats, public;

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cuisine_type VARCHAR(100),
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    rating DECIMAL(3, 2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    geo_key VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food items table
CREATE TABLE IF NOT EXISTS food_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geo_key VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(20),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    rating DECIMAL(3, 2) DEFAULT 0.0,
    geo_key VARCHAR(50),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    driver_id INTEGER REFERENCES drivers(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    special_instructions TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    food_item_id INTEGER REFERENCES food_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_geo_key ON restaurants(geo_key);

CREATE INDEX IF NOT EXISTS idx_food_items_restaurant ON food_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_items_available ON food_items(is_available);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
CREATE INDEX IF NOT EXISTS idx_customers_geo_key ON customers(geo_key);

CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST (ST_SetSRID(ST_MakePoint(current_longitude, current_latitude), 4326));
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available, is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_geo_key ON drivers(geo_key);
CREATE INDEX IF NOT EXISTS idx_drivers_version ON drivers(version);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_version ON orders(version);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_food_item ON order_items(food_item_id);

-- Unique constraint to prevent multiple active orders per driver
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_order_per_driver 
ON orders(driver_id) 
WHERE status IN ('assigned', 'picked_up', 'in_transit');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO restaurants (name, description, cuisine_type, address, latitude, longitude, phone, email, rating, geo_key) VALUES
('Pizza Palace', 'Best pizza in town', 'Italian', '123 Main St, Downtown', 40.7128, -74.0060, '+1-555-0123', 'info@pizzapalace.com', 4.5, '40_-74'),
('Burger Joint', 'Juicy burgers and fries', 'American', '456 Oak Ave, Midtown', 40.7589, -73.9851, '+1-555-0124', 'hello@burgerjoint.com', 4.2, '40_-73'),
('Sushi Express', 'Fresh sushi and sashimi', 'Japanese', '789 Pine St, Uptown', 40.7505, -73.9934, '+1-555-0125', 'contact@sushiexpress.com', 4.7, '40_-73')
ON CONFLICT DO NOTHING;

INSERT INTO food_items (restaurant_id, name, description, price, category, is_vegetarian, is_vegan, is_gluten_free) VALUES
(1, 'Margherita Pizza', 'Classic tomato and mozzarella', 15.99, 'Pizza', false, false, false),
(1, 'Pepperoni Pizza', 'Spicy pepperoni with cheese', 17.99, 'Pizza', false, false, false),
(1, 'Veggie Pizza', 'Fresh vegetables and cheese', 16.99, 'Pizza', true, false, false),
(2, 'Classic Burger', 'Beef patty with lettuce and tomato', 12.99, 'Burgers', false, false, false),
(2, 'Chicken Burger', 'Grilled chicken breast', 11.99, 'Burgers', false, false, false),
(2, 'Veggie Burger', 'Plant-based patty', 13.99, 'Burgers', true, true, false),
(3, 'California Roll', 'Crab, avocado, cucumber', 8.99, 'Rolls', false, false, true),
(3, 'Salmon Nigiri', 'Fresh salmon over rice', 6.99, 'Nigiri', false, false, true),
(3, 'Veggie Roll', 'Cucumber, avocado, carrot', 7.99, 'Rolls', true, true, true)
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, email, phone, address, latitude, longitude, geo_key) VALUES
('John Doe', 'john.doe@email.com', '+1-555-0001', '100 Customer St, Downtown', 40.7128, -74.0060, '40_-74'),
('Jane Smith', 'jane.smith@email.com', '+1-555-0002', '200 Customer Ave, Midtown', 40.7589, -73.9851, '40_-73'),
('Bob Johnson', 'bob.johnson@email.com', '+1-555-0003', '300 Customer Blvd, Uptown', 40.7505, -73.9934, '40_-73')
ON CONFLICT DO NOTHING;

INSERT INTO drivers (name, email, phone, vehicle_type, vehicle_number, current_latitude, current_longitude, is_available, is_online, rating, geo_key) VALUES
('Mike Wilson', 'mike.wilson@swifteats.com', '+1-555-1001', 'Motorcycle', 'MC001', 40.7128, -74.0060, true, true, 4.8, '40_-74'),
('Sarah Davis', 'sarah.davis@swifteats.com', '+1-555-1002', 'Car', 'CAR001', 40.7589, -73.9851, true, true, 4.6, '40_-73'),
('Tom Brown', 'tom.brown@swifteats.com', '+1-555-1003', 'Bicycle', 'BIKE001', 40.7505, -73.9934, true, true, 4.9, '40_-73'),
('Lisa Garcia', 'lisa.garcia@swifteats.com', '+1-555-1004', 'Motorcycle', 'MC002', 40.7128, -74.0060, true, true, 4.7, '40_-74'),
('David Lee', 'david.lee@swifteats.com', '+1-555-1005', 'Car', 'CAR002', 40.7589, -73.9851, true, true, 4.5, '40_-73')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA swift_eats TO swift_eats_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA swift_eats TO swift_eats_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA swift_eats TO swift_eats_user;
GRANT USAGE ON SCHEMA swift_eats TO swift_eats_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA swift_eats GRANT ALL ON TABLES TO swift_eats_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA swift_eats GRANT ALL ON SEQUENCES TO swift_eats_user;

-- Create a function to get nearby restaurants
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
    user_lat DECIMAL(10, 8),
    user_lon DECIMAL(11, 8),
    radius_km INTEGER DEFAULT 5
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    description TEXT,
    cuisine_type VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    email VARCHAR(255),
    rating DECIMAL(3, 2),
    distance_km DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.description,
        r.cuisine_type,
        r.address,
        r.latitude,
        r.longitude,
        r.phone,
        r.email,
        r.rating,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography
        ) / 1000.0 as distance_km
    FROM restaurants r
    WHERE r.is_active = true
    AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get nearby drivers
CREATE OR REPLACE FUNCTION get_nearby_drivers(
    user_lat DECIMAL(10, 8),
    user_lon DECIMAL(11, 8),
    radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    vehicle_type VARCHAR(50),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    is_available BOOLEAN,
    is_online BOOLEAN,
    rating DECIMAL(3, 2),
    distance_km DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.email,
        d.phone,
        d.vehicle_type,
        d.current_latitude,
        d.current_longitude,
        d.is_available,
        d.is_online,
        d.rating,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography
        ) / 1000.0 as distance_km
    FROM drivers d
    WHERE d.is_available = true AND d.is_online = true
    AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_nearby_restaurants(DECIMAL, DECIMAL, INTEGER) TO swift_eats_user;
GRANT EXECUTE ON FUNCTION get_nearby_drivers(DECIMAL, DECIMAL, INTEGER) TO swift_eats_user;

-- Create a view for order statistics
CREATE OR REPLACE VIEW order_stats AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
    AVG(total_amount) as avg_order_value,
    SUM(total_amount) as total_revenue
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

GRANT SELECT ON order_stats TO swift_eats_user;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Swift Eats database initialized successfully!';
    RAISE NOTICE 'Created % restaurants, % food items, % customers, % drivers', 
        (SELECT COUNT(*) FROM restaurants),
        (SELECT COUNT(*) FROM food_items),
        (SELECT COUNT(*) FROM customers),
        (SELECT COUNT(*) FROM drivers);
END $$;

