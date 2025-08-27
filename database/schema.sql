-- Swift Eats Database Schema
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create customers table
CREATE TABLE customers (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    contact VARCHAR(100) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create restaurants table
CREATE TABLE restaurants (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    tags JSONB NOT NULL DEFAULT '{}',
    pictures TEXT[] DEFAULT '{}',
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    operating_hours JSONB DEFAULT '{}',
    is_open BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create food_items table
CREATE TABLE food_items (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    picture TEXT,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    tags JSONB NOT NULL DEFAULT '{}',
    preparation_time INTEGER NOT NULL CHECK (preparation_time > 0),
    available BOOLEAN DEFAULT true,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    inventory_count INTEGER DEFAULT 0 CHECK (inventory_count >= 0),
    restaurant_id UUID NOT NULL REFERENCES restaurants(_id) ON DELETE CASCADE,
    restaurant_name VARCHAR(100) NOT NULL,
    restaurant_location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create drivers table
CREATE TABLE drivers (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    busy BOOLEAN DEFAULT false,
    current_order UUID,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN (
        'available', 'order_assigned', 'on_way_to_restaurant', 
        'at_restaurant', 'picked_up', 'on_way_to_customer', 'reached_destination'
    )),
    current_location GEOGRAPHY(POINT, 4326),
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(_id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL,
    driver_id UUID REFERENCES drivers(_id),
    driver_name VARCHAR(100),
    restaurant_id UUID NOT NULL REFERENCES restaurants(_id) ON DELETE CASCADE,
    restaurant_name VARCHAR(100) NOT NULL,
    items JSONB NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'new_order' CHECK (current_status IN (
        'new_order', 'order_received', 'food_preparing', 'ready_pickup',
        'assigned_driver', 'picked_up', 'out_delivery', 'delivered'
    )),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    destination GEOGRAPHY(POINT, 4326) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance

-- Spatial indexes for location-based queries
CREATE INDEX idx_customers_location ON customers USING GIST (location);
CREATE INDEX idx_restaurants_location ON restaurants USING GIST (location);
CREATE INDEX idx_food_items_restaurant_location ON food_items USING GIST (restaurant_location);
CREATE INDEX idx_drivers_location ON drivers USING GIST (location);
CREATE INDEX idx_drivers_current_location ON drivers USING GIST (current_location);
CREATE INDEX idx_orders_destination ON orders USING GIST (destination);

-- B-tree indexes for common queries
CREATE INDEX idx_restaurants_name ON restaurants (name);
CREATE INDEX idx_restaurants_cuisine ON restaurants ((tags->>'cuisine'));
CREATE INDEX idx_restaurants_is_open ON restaurants (is_open);
CREATE INDEX idx_restaurants_rating ON restaurants (rating);

CREATE INDEX idx_food_items_restaurant_id ON food_items (restaurant_id);
CREATE INDEX idx_food_items_type ON food_items (type);
CREATE INDEX idx_food_items_available ON food_items (available);
CREATE INDEX idx_food_items_price ON food_items (price);
CREATE INDEX idx_food_items_cuisine ON food_items ((tags->>'cuisine'));
CREATE INDEX idx_food_items_dietary ON food_items ((tags->>'dietary'));

CREATE INDEX idx_drivers_busy ON drivers (busy);
CREATE INDEX idx_drivers_status ON drivers (status);
CREATE INDEX idx_drivers_current_order ON drivers (current_order);

CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_restaurant_id ON orders (restaurant_id);
CREATE INDEX idx_orders_driver_id ON orders (driver_id);
CREATE INDEX idx_orders_status ON orders (current_status);
CREATE INDEX idx_orders_created_at ON orders (created_at);

-- Full-text search indexes
CREATE INDEX idx_restaurants_name_search ON restaurants USING GIN (to_tsvector('english', name));
CREATE INDEX idx_food_items_name_search ON food_items USING GIN (to_tsvector('english', name));
CREATE INDEX idx_food_items_description_search ON food_items USING GIN (to_tsvector('english', description));

-- Composite indexes for complex queries
CREATE INDEX idx_restaurants_location_cuisine ON restaurants USING GIST (location) WHERE (tags->>'cuisine') IS NOT NULL;
CREATE INDEX idx_food_items_restaurant_available ON food_items (restaurant_id, available);
CREATE INDEX idx_orders_customer_status ON orders (customer_id, current_status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to find restaurants within radius
CREATE OR REPLACE FUNCTION find_restaurants_nearby(
    customer_lat DOUBLE PRECISION,
    customer_lon DOUBLE PRECISION,
    search_radius DOUBLE PRECISION,
    max_results INTEGER DEFAULT 20
) RETURNS TABLE (
    restaurant_id UUID,
    name VARCHAR(100),
    distance DOUBLE PRECISION,
    rating DECIMAL(3,2),
    cuisine TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r._id,
        r.name,
        ST_Distance(
            r.location::geography,
            ST_SetSRID(ST_MakePoint(customer_lon, customer_lat), 4326)::geography
        ) as distance,
        r.rating,
        r.tags->>'cuisine' as cuisine
    FROM restaurants r
    WHERE ST_DWithin(
        r.location::geography,
        ST_SetSRID(ST_MakePoint(customer_lon, customer_lat), 4326)::geography,
        search_radius * 1000
    )
    AND r.is_open = true
    ORDER BY distance
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert sample data for testing

-- Sample customers
INSERT INTO customers (name, location, contact, rating) VALUES
('John Doe', ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326), '+1-555-0101', 4.5),
('Jane Smith', ST_SetSRID(ST_MakePoint(-74.0061, 40.7129), 4326), '+1-555-0102', 4.8),
('Bob Johnson', ST_SetSRID(ST_MakePoint(-74.0062, 40.7130), 4326), '+1-555-0103', 4.2);

-- Sample restaurants
INSERT INTO restaurants (name, location, tags, pictures, rating, operating_hours, is_open) VALUES
('Pizza Palace', ST_SetSRID(ST_MakePoint(-74.0050, 40.7130), 4326), 
 '{"cuisine": "italian", "dietary": ["veg", "non-veg"]}', 
 '{"https://example.com/pizza1.jpg", "https://example.com/pizza2.jpg"}', 
 4.6, '{"open": "10:00", "close": "22:00"}', true),
('Burger House', ST_SetSRID(ST_MakePoint(-74.0055, 40.7125), 4326), 
 '{"cuisine": "american", "dietary": ["non-veg"]}', 
 '{"https://example.com/burger1.jpg"}', 
 4.3, '{"open": "11:00", "close": "23:00"}', true),
('Sushi Express', ST_SetSRID(ST_MakePoint(-74.0045, 40.7135), 4326), 
 '{"cuisine": "japanese", "dietary": ["veg", "non-veg"]}', 
 '{"https://example.com/sushi1.jpg"}', 
 4.7, '{"open": "12:00", "close": "21:00"}', true);

-- Sample food items
INSERT INTO food_items (name, picture, description, type, tags, preparation_time, available, price, inventory_count, restaurant_id, restaurant_name, restaurant_location) VALUES
('Margherita Pizza', 'https://example.com/margherita.jpg', 'Classic tomato and mozzarella pizza', 'pizza', '{"cuisine": "italian", "dietary": "veg"}', 15, true, 18.99, 10, 
 (SELECT _id FROM restaurants WHERE name = 'Pizza Palace'), 'Pizza Palace', 
 (SELECT location FROM restaurants WHERE name = 'Pizza Palace')),
('Pepperoni Pizza', 'https://example.com/pepperoni.jpg', 'Spicy pepperoni with cheese', 'pizza', '{"cuisine": "italian", "dietary": "non-veg"}', 18, true, 22.99, 8, 
 (SELECT _id FROM restaurants WHERE name = 'Pizza Palace'), 'Pizza Palace', 
 (SELECT location FROM restaurants WHERE name = 'Pizza Palace')),
('Classic Burger', 'https://example.com/classic-burger.jpg', 'Beef burger with lettuce and tomato', 'burger', '{"cuisine": "american", "dietary": "non-veg"}', 12, true, 15.99, 15, 
 (SELECT _id FROM restaurants WHERE name = 'Burger House'), 'Burger House', 
 (SELECT location FROM restaurants WHERE name = 'Burger House')),
('California Roll', 'https://example.com/california-roll.jpg', 'Avocado and cucumber roll', 'sushi', '{"cuisine": "japanese", "dietary": "veg"}', 8, true, 12.99, 20, 
 (SELECT _id FROM restaurants WHERE name = 'Sushi Express'), 'Sushi Express', 
 (SELECT location FROM restaurants WHERE name = 'Sushi Express'));

-- Sample drivers
INSERT INTO drivers (name, location, rating, busy, status) VALUES
('Mike Wilson', ST_SetSRID(ST_MakePoint(-74.0050, 40.7120), 4326), 4.8, false, 'available'),
('Sarah Davis', ST_SetSRID(ST_MakePoint(-74.0055, 40.7125), 4326), 4.6, false, 'available'),
('Tom Brown', ST_SetSRID(ST_MakePoint(-74.0045, 40.7130), 4326), 4.4, false, 'available');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
