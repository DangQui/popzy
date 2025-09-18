// Mảng tĩnh được gắn vào constructor Modal để lưu trữ tất cả instance Modal đang mở
Popzy.elements = [];

// Hàm khởi tạo constructor của lớp Modal, nhận tham số options để cấu hình modal
function Popzy(options = {}) {
  if (!options.content && !options.templateId) {
    console.error("You must provide one of 'content' or 'templateId.");
    return;
  }

  if (options.content && options.templateId) {
    options.templateId = null;
    console.warn(
      "Both 'content' and 'templateId' are specified. 'content' will take precedence, and 'templateId' will be ignored."
    );
  }

  // Lấy phần tử <template> từ DOM dựa trên templateId được cung cấp trong options
  if (options.templateId) {
    this.template = document.querySelector(`#${options.templateId}`);

    // Nếu template không tồn tại, ghi log lỗi và thoát hàm
    if (!this.template) {
      console.error(`#${options.templateId} does not exist!`);
      return;
    }
  }

  // Gôp các tùy chọn mặc định với các tùy chọn được truyền từ tham số options
  this.opt = Object.assign(
    {
      enableScrollLock: true,
      scrollLockTarget: () => document.body,
      destroyOnClose: true, // Xóa modal khỏi DOM khi đóng
      footer: false, // Không hiển thị footer mặc định
      cssClass: [], // Mảng các class CSS tùy chỉnh cho modal
      closeMethods: ["button", "overlay", "escape"], // Các phương thức cho phép đóng modal
    },
    options
  );

  this.content = this.opt.content;
  // Lấy danh sách các phương thức đóng modal từ options
  const { closeMethods } = this.opt;
  // Các cờ (flags) để xác định xem modal có thể đóng theo cách nào
  this._allowButtonClose = closeMethods.includes("button"); // Cho phép đóng bằng nút
  this._allowBackdropClose = closeMethods.includes("overlay"); // Cho phép đóng bằng lớp phủ
  this._allowEscapeClose = closeMethods.includes("escape"); // Cho phép đóng bằng phím ESC

  // Mảng lưu trữ các nút trong footer (nếu có)
  this._footerButtons = [];

  // Ràng buộc (bind) phương thức _handleEscapeKey với instance hiện tại của modal
  this._handleEscapeKey = this._handleEscapeKey.bind(this);
}

// Phương thức xây dựng cấu trúc DOM của modal
Popzy.prototype._build = function () {
  // Sao chép nội dung từ template để sử dụng trong modal
  const contentNode = this.content
    ? document.createElement("div")
    : this.template.content.cloneNode(true);

  if (this.content) {
    contentNode.innerHTML = this.content;
  }

  // Tạo phần tử backdrop (lớp phủ nền) cho modal
  this._modalBackdrop = document.createElement("div");
  this._modalBackdrop.className = "popzy__backdrop"; // Gán class CSS cho backdrop

  // Tạo container chính của modal
  const container = document.createElement("div");
  container.className = "popzy__container"; // Gán class CSS cho container

  // Thêm các class CSS tùy chỉnh tử options.cssClass vào container
  this.opt.cssClass.forEach((className) => {
    if (typeof className === "string") {
      container.classList.add(className); // Chỉ thêm nếu className là chuỗi
    }
  });

  // Nếu cho phép đóng bằng nút (button), tạo nút đóng "X" và thêm vào container
  if (this._allowButtonClose) {
    const closeBtn = this._createButton("&times;", "popzy__close", () =>
      this.close()
    );
    container.append(closeBtn); // Thêm nút vào container
  }

  // Tạo phần tử chứa nội dung chính của modal
  this._modalContent = document.createElement("div");
  this._modalContent.className = "popzy__content";

  // Thêm nội dung từ template vào this._modalContent
  this._modalContent.append(contentNode);
  // Thêm this._modalContent vào container
  container.append(this._modalContent);

  // Nếu footer được bật trong options, tạo footer cho modal
  if (this.opt.footer) {
    this._modalFooter = document.createElement("div");
    this._modalFooter.className = "popzy__footer"; // Gấn class CSS cho footer

    // Render nội dung và các nút cho footer
    this._renderFooterContent(); // Gọi hàm để render nội dung footer
    this._renderFooterButton(); // Gọi hàm để render các nút trong footer

    container.append(this._modalFooter); // Thêm footer vào container
  }

  // Thêm container vào modalBackdrop
  this._modalBackdrop.append(container);
  // Thêm modalBackdrop vào body của trang
  document.body.append(this._modalBackdrop);
};

// Phương thức để đặt nội dung cho HTML content
Popzy.prototype.setContent = function (content) {
  this.content = content;
  if (this._modalContent) {
    this._modalContent.innerHTML = this.content;
  }
};

// Phướng thức để đặt nội dung HTML cho footer
Popzy.prototype.setFooterContent = function (html) {
  this._footerContent = html; // Lưu nội dung HTML vào biến instance
  this._renderFooterContent(); // Gọi hàm để render nội dung footer
};

// Phương thức để thêm nút vào footer
Popzy.prototype.addFooterButton = function (title, cssClass, callback) {
  // Tạo nút với tiêu đề, class CSS và hàm callback khi nhấn
  const button = this._createButton(title, cssClass, callback);
  this._footerButtons.push(button); // Thêm nút vào mảng _footerButtons
  this._renderFooterButton(); // Gọi hàm để reder lại các nút trong footer
};

// Phương thức render nội dung footer
Popzy.prototype._renderFooterContent = function () {
  // Nếu footer tồn tại và có nội dung, đặt nội dung HTML cho footer
  if (this._modalFooter && this._footerContent) {
    this._modalFooter.innerHTML = this._footerContent;
  }
};

// Phương thức render các nút trong footer
Popzy.prototype._renderFooterButton = function () {
  // Nếu footer tồn tại, thêm các nút trong _footerButtons vào footer
  if (this._modalFooter) {
    this._footerButtons.forEach((buttonElement) => {
      this._modalFooter.append(buttonElement);
    });
  }
};

// Phương thức tiện ích để tạo một nút HTML
Popzy.prototype._createButton = function (title, cssClass, callback) {
  const button = document.createElement("button"); // Tạo phần tử <button>
  button.className = cssClass; // Gán class CSS cho nút
  button.innerHTML = title; // Đặt nội dung HTML cho nút
  button.onclick = callback; // Gán hàm callback khi nút được nhấn
  return button; // Trả về phần tử nút
};

// Phương thức mở modal
Popzy.prototype.open = function () {
  // Thêm instance Modal hiện tại vào mảng Popzy.elements để theo dõi
  Popzy.elements.push(this);

  // Nếu modalBackdrop chưa được tạo, gọi _build để tạo cấu trúc DOM
  if (!this._modalBackdrop) {
    this._build();
  }

  // Thêm class "show" vào modalBackdrop để hiển thị modal (thường với hiệu ứng CSS)
  setTimeout(() => {
    this._modalBackdrop.classList.add("popzy--show");
  }, 0); // setTimeout đảm bảo hiệu ứng CSS được áp dụng sau khi render

  // Vô hiệu hóa thanh cuộn của trang web khi modal đang mở
  if (this.opt.enableScrollLock) {
    const target = this.opt.scrollLockTarget();

    if (this._hasScrollbar(target)) {
      target.classList.add("popzy--no-scroll"); // Thêm class để chặn cuộn
      const targetPadRight = parseInt(getComputedStyle(target).paddingRight);
      // Thêm padding để tránh dịch chuyển nội dung do danh cuộn bị chặn
      target.style.paddingRight =
        targetPadRight + this._getScrollbarWidth() + "px";
    }
  }

  // Nếu cho phép đóng bằng lớp phủ (backdrop), thêm sự kiện click để đong modal khi nhấn
  if (this._allowBackdropClose) {
    this._modalBackdrop.onclick = (e) => {
      // Chỉ đóng nếu nhấn đúng vào overlay (backdrop)
      if (e.target === this._modalBackdrop) {
        this.close();
      }
    };
  }

  // Nếu cho phép đóng bằng phím Escape, thêm sự kiện keydown
  if (this._allowEscapeClose) {
    document.addEventListener("keydown", this._handleEscapeKey);
  }

  // Gọi hàm xử lý sự kiện transition (khi hiệu ứng mở hoàn tất)
  this._onTransitionEnd(this.opt.onOpen);

  // Trả về phần tử modalBackdrop để có thể sử dụng thêm (nếu cần)
  return this._modalBackdrop;
};

Popzy.prototype._hasScrollbar = (target) => {
  if ([document.documentElement, document.body].includes(target)) {
    return (
      document.documentElement.scrollHeight >
        document.documentElement.clientHeight ||
      document.body.scrollHeight > document.body.clientHeight
    );
  }
  return target.scrollHeight > target.clientHeight;
};

// Phương thức xử lý sự kiện phím Escape
Popzy.prototype._handleEscapeKey = function (e) {
  // Lấy modal cuối cùng từ mảng Popzy.elements
  const lastModal = Popzy.elements[Popzy.elements.length - 1];
  // Nếu phím Escape được nhấn và modal hiện tại là modal cuối cùng trong mảng
  if (e.key === "Escape" && this === lastModal) {
    this.close();
  }
};

// Phương thức xử lý sự kiện transitionend (khi hiệu ứng CSS hoàn tất)
Popzy.prototype._onTransitionEnd = function (callback) {
  // Thêm sự kiện transitionend cho modalBackdrop
  this._modalBackdrop.ontransitionend = (e) => {
    // Chỉ xử lý nếu thuộc tính chuyển đối là "transform"
    if (e.propertyName !== "transform") return;
    // Gọi hàm callback nếu nó là một hàm
    if (typeof callback === "function") callback();
  };
};

// Phương thức đống modal
Popzy.prototype.close = function (destroy = this.opt.destroyOnClose) {
  // Xóa modal hiện tại khỏi mảng Popzy.elements
  Popzy.elements.pop();
  // Xóa class "show" để ẩn modal
  this._modalBackdrop.classList.remove("popzy--show");

  // Nếu cho phép đóng bằng Escape, xóa sự kiện keydown
  if (this._allowEscapeClose) {
    document.removeEventListener("keydown", this._handleEscapeKey);
  }

  // Gọi hàm xử lý transitionend để thực hiện các hành động sau khi hiệu ứng đóng hoàn tất
  this._onTransitionEnd(() => {
    // Nếu destroy = true, xóa modalBackdrop khỏi DOM và đặt lại các biến
    if (this._modalBackdrop && destroy) {
      this._modalBackdrop.remove();
      this._modalBackdrop = null;
      this._modalFooter = null;
    }

    // Nếu không còn modal nào mở, bật lại thanh cuộn và xóa padding
    if (this.opt.enableScrollLock && !Popzy.elements.length) {
      const target = this.opt.scrollLockTarget();

      if (this._hasScrollbar(target)) {
        target.classList.remove("popzy--no-scroll");
        target.style.paddingRight = "";
      }
    }

    // Gọi lại hàm onClose nếu options (nếu có)
    if (typeof this.opt.onClose === "function") {
      this.opt.onClose();
    }
  });
};

// Phương thức xóa modal (gọi close với destroy = true)
Popzy.prototype.destroy = function () {
  this.close(true);
};

// Phương thức tính chiều rộng của thanh cuộn (scrollbar)
Popzy.prototype._getScrollbarWidth = function () {
  // Nếu chiều rộng đã được tính trước đó, trả về giá trị đã lưu
  if (this._scrollbarWidth) return this._scrollbarWidth;

  // Tạo một div tạm để đo chiều rộng thanh cuộn
  const div = document.createElement("div");
  Object.assign(div.style, {
    overflow: "scroll",
    position: "absolute",
    top: "-9999px",
  });

  // Thêm div vào body tính toán chiều rộng thanh cuộn (offsetWidth - clientWidth)
  document.body.appendChild(div);
  this._scrollbarWidth = div.offsetWidth - div.clientWidth;
  document.body.removeChild(div); // Xóa div sau khi tính

  return this._scrollbarWidth;
};
