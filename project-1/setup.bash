docker compose up -d
docker exec -i mysql_db mysql -u root -proot < setup.sql
docker exec -it mysql_db mysql -u root -proot -e "USE driver_analytics; SELECT COUNT(*) FROM drivers;"
