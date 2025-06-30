image_name = eduart-nodered:0.5.0

download-sources:
	git clone --branch 0.5.0 https://github.com/EduArt-Robotik/edu_nodered_ros2_plugin.git

build-docker:
	docker build -t $(image_name) .

upload-docker:
	docker tag $(image_name) eduartrobotik/$(image_name)
	docker push eduartrobotik/$(image_name)

build-multiarch-and-push:
	docker buildx build --platform linux/amd64,linux/arm64/v8 -t eduartrobotik/$(image_name) --push .

clean:
	rm -rf edu_robot
