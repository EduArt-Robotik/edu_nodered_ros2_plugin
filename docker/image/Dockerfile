ARG ROS_DISTRO=jazzy
FROM eduartrobotik/eduart-robot:1.0.2

# Avoid interactuation with installation of some package that needs the locale.
USER root
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
ENV ROS_DISTRO=jazzy

# Avoids using interactions during building
ENV DEBIAN_FRONTEND=noninteractive

# Use a bash shell so it is possigle to run things like `source` (required for colcon builds)
SHELL ["/bin/bash", "-c"]


# Install Integration Service dependencies
RUN apt-get update \
    && apt-get remove -y \
        nodejs \
        libnode-dev \
        libnode72 \
    && apt-get install -y \
        cmake \
        curl \
        g++ \
        gcc \
        make \
        git \
        libasio-dev \
        libboost-dev \
        libboost-program-options-dev \
        libboost-system-dev \
        libcurl4-openssl-dev \
        libcurlpp-dev \
        libssl-dev \
        libwebsocketpp-dev \
        libyaml-cpp-dev \
        wget \
        python3-colcon-common-extensions \
        python3-vcstool \
    && curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.bash && \
    chmod +x nodesource_setup.bash && \
    bash -c ./nodesource_setup.bash && \
    apt-get install -y \
        nodejs \
        ros-$ROS_DISTRO-turtlesim \
        ros-$ROS_DISTRO-control-msgs \
        ros-$ROS_DISTRO-nav2-msgs \
        ros-$ROS_DISTRO-aruco-opencv-msgs \
        ros-$ROS_DISTRO-zbar-ros-interfaces

# Add custom ROS messages via sources
RUN echo "Adding custom ROS messages via sources" \
    # Livox SDK2
    && cd /tmp \
    && git clone https://github.com/Livox-SDK/Livox-SDK2.git \
    && cd Livox-SDK2 \
    && sed -i '/^#include/a#include <cstdint>' sdk_core/comm/define.h \
    && sed -i '/^#include/a#include <cstdint>' sdk_core/logger_handler/file_manager.h \
    && mkdir build \
    && cd build \
    && cmake .. \
    && make -j$(nproc) \
    && make install \
    && rm -rf /tmp/Livox-SDK2
    # ROS2 Interface for Livox SDK2
USER user
RUN cd /home/user/ros/src \
    && git clone https://github.com/Livox-SDK/livox_ros_driver2.git \
    && cd livox_ros_driver2 \
    && source /opt/ros/$ROS_DISTRO/setup.bash \
    && ./build.sh humble

USER root

# Install Node-RED and node-red-ros2-plugin
RUN source /opt/ros/$ROS_DISTRO/setup.bash \
    && source /home/user/ros/install/setup.bash \
    && npm install -g --unsafe-perm \
        rimraf \
        uuid \
        node-red \
        rclnodejs \
        cron

# Coping and Installing ROS2 Plugin
COPY ./edu_nodered_ros2_plugin /home/user/edu_nodered_ros2_plugin
RUN echo "installing plugins" \
    # instlling dashboad
    && npm install -g node-red-dashboard \
    # Installing
    && cd /home/user/ \
    && npm install -g ./edu_nodered_ros2_plugin

RUN echo "creating storage for flow data" \
    && mkdir -p /data \
    && chmod a+w /data

# Enable overlay execution
WORKDIR /
COPY ./entrypoint.bash .
RUN chmod +x /entrypoint.bash

# CMD [ "node", "/usr/bin/node-red" ]
CMD /usr/bin/node-red
ENTRYPOINT [ "/entrypoint.bash" ]
