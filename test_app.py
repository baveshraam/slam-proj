"""
Simple tests for the SLAM Simulation Backend.
Run with: pytest test_app.py
"""
import pytest
from app import app, robot, Robot, is_valid_position, TRUE_MAP, FLOOR, WALL, MAP_SIZE


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def reset_robot():
    """Reset robot before each test."""
    robot.reset()


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'


def test_get_state(client):
    """Test get_state endpoint."""
    response = client.get('/api/get_state')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'robot' in data['data']
    assert 'true_map' in data['data']
    assert 'map_info' in data['data']


def test_robot_initialization():
    """Test Robot class initialization."""
    test_robot = Robot(x=5, y=5, angle=90)
    assert test_robot.x == 5
    assert test_robot.y == 5
    assert test_robot.angle == 90


def test_robot_reset():
    """Test robot reset functionality."""
    robot.x = 10
    robot.y = 10
    robot.angle = 180
    robot.reset()
    assert robot.x == 1
    assert robot.y == 1
    assert robot.angle == 0


def test_robot_rotate_left():
    """Test robot left rotation."""
    robot.angle = 0
    robot.rotate_left()
    assert robot.angle == 90
    robot.rotate_left()
    assert robot.angle == 180
    robot.rotate_left()
    assert robot.angle == 270
    robot.rotate_left()
    assert robot.angle == 0


def test_robot_rotate_right():
    """Test robot right rotation."""
    robot.angle = 0
    robot.rotate_right()
    assert robot.angle == 270
    robot.rotate_right()
    assert robot.angle == 180


def test_is_valid_position():
    """Test position validation."""
    # Valid floor position
    assert is_valid_position(1, 1) is True
    
    # Wall position (border)
    assert is_valid_position(0, 0) is False
    
    # Out of bounds
    assert is_valid_position(-1, 5) is False
    assert is_valid_position(MAP_SIZE, 5) is False


def test_robot_move_forward(client):
    """Test robot movement."""
    # Reset to (1, 1, 0°/East)
    robot.reset()
    
    # Move east should succeed
    response = client.post('/api/move')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert robot.x == 2
    assert robot.y == 1


def test_robot_blocked_movement(client):
    """Test robot blocked by wall."""
    robot.reset()
    robot.x = 1
    robot.y = 1
    robot.angle = 180  # West, facing wall at x=0
    
    response = client.post('/api/move')
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'wall or boundary' in data['message'].lower()
    assert robot.x == 1  # Should not move


def test_rotate_endpoints(client):
    """Test rotation endpoints."""
    robot.reset()
    
    # Rotate left
    response = client.post('/api/rotate_left')
    assert response.status_code == 200
    assert robot.angle == 90
    
    # Rotate right
    response = client.post('/api/rotate_right')
    assert response.status_code == 200
    assert robot.angle == 0


def test_reset_endpoint(client):
    """Test reset endpoint."""
    robot.x = 10
    robot.y = 10
    robot.angle = 270
    
    response = client.post('/api/reset')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert robot.x == 1
    assert robot.y == 1
    assert robot.angle == 0


def test_map_info(client):
    """Test map info endpoint."""
    response = client.get('/api/map_info')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['width'] == MAP_SIZE
    assert data['data']['height'] == MAP_SIZE
    assert data['data']['total_cells'] == MAP_SIZE * MAP_SIZE


def test_map_has_borders():
    """Test that map has proper borders."""
    # Check all four borders
    for i in range(MAP_SIZE):
        assert TRUE_MAP[0, i] == WALL  # Top
        assert TRUE_MAP[MAP_SIZE-1, i] == WALL  # Bottom
        assert TRUE_MAP[i, 0] == WALL  # Left
        assert TRUE_MAP[i, MAP_SIZE-1] == WALL  # Right


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
