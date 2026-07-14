/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AppContext";

type FieldErrors = Record<string, string[] | undefined>;

export default function RegistrationPage() {
    const router = useRouter();
    const { setUser } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreed, setAgreed] = useState(true);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);

    const fetchRegister = useCallback(
        async function () {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({ name, email, password, confirmPassword, remember: true }),
            });
            const data = await response.json();
            return data;
        },
        [name, email, password, confirmPassword],
    );

    const registerMutation = useMutation({
        mutationFn: fetchRegister,
        onSuccess: (result) => {
            if (!result.success) {
                setErrors(result.errors ?? {});
                setFormError(result.message);
                return;
            }
            setErrors({});
            setFormError(null);
            setUser(result.user);
            router.replace("/");
            router.refresh();
        },
        onError: () => {
            setFormError("Something went wrong while registering");
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);
        setErrors({});

        if (!agreed) {
            setFormError("You must agree to the terms & conditions");
            return;
        }

        registerMutation.mutate();
    }

    const isSubmitting = registerMutation.isPending;

    return (
        <section className="_social_registration_wrapper _layout_main_wrapper">
            <div className="_shape_one">
                <img src="/assets/images/shape1.svg" alt="" className="_shape_img" />
                <img src="/assets/images/dark_shape.svg" alt="" className="_dark_shape" />
            </div>
            <div className="_shape_two">
                <img src="/assets/images/shape2.svg" alt="" className="_shape_img" />
                <img src="/assets/images/dark_shape1.svg" alt="" className="_dark_shape _dark_shape_opacity" />
            </div>
            <div className="_shape_three">
                <img src="/assets/images/shape3.svg" alt="" className="_shape_img" />
                <img src="/assets/images/dark_shape2.svg" alt="" className="_dark_shape _dark_shape_opacity" />
            </div>
            <div className="_social_registration_wrap">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                            <div className="_social_registration_right">
                                <div className="_social_registration_right_image">
                                    <img src="/assets/images/registration.png" alt="Image" />
                                </div>
                                <div className="_social_registration_right_image_dark">
                                    <img src="/assets/images/registration1.png" alt="Image" />
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                            <div className="_social_registration_content">
                                <div className="_social_registration_right_logo _mar_b28">
                                    <img src="/assets/images/logo.svg" alt="Image" className="_right_logo" />
                                </div>
                                <p className="_social_registration_content_para _mar_b8">Get Started Now</p>
                                <h4 className="_social_registration_content_title _titl4 _mar_b50">Registration</h4>
                                <button type="button" className="_social_registration_content_btn _mar_b40">
                                    <img src="/assets/images/google.svg" alt="Image" className="_google_img" />
                                    <span>Register with google</span>
                                </button>
                                <div className="_social_registration_content_bottom_txt _mar_b40">
                                    <span>Or</span>
                                </div>
                                <form className="_social_registration_form" onSubmit={handleSubmit} noValidate>
                                    <div className="row">
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label
                                                    className="_social_registration_label _mar_b8"
                                                    htmlFor="reg-name"
                                                >
                                                    Name
                                                </label>
                                                <input
                                                    id="reg-name"
                                                    type="text"
                                                    name="name"
                                                    autoComplete="name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="form-control _social_registration_input"
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                                {errors.name?.[0] ? (
                                                    <small className="text-danger">{errors.name[0]}</small>
                                                ) : null}
                                            </div>
                                        </div>{" "}
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label
                                                    className="_social_registration_label _mar_b8"
                                                    htmlFor="reg-email"
                                                >
                                                    Email
                                                </label>
                                                <input
                                                    id="reg-email"
                                                    type="email"
                                                    name="email"
                                                    autoComplete="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="form-control _social_registration_input"
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                                {errors.email?.[0] ? (
                                                    <small className="text-danger">{errors.email[0]}</small>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label
                                                    className="_social_registration_label _mar_b8"
                                                    htmlFor="reg-password"
                                                >
                                                    Password
                                                </label>
                                                <input
                                                    id="reg-password"
                                                    type="password"
                                                    name="password"
                                                    autoComplete="new-password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="form-control _social_registration_input"
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                                {errors.password?.[0] ? (
                                                    <small className="text-danger">{errors.password[0]}</small>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label
                                                    className="_social_registration_label _mar_b8"
                                                    htmlFor="reg-confirm-password"
                                                >
                                                    Repeat Password
                                                </label>
                                                <input
                                                    id="reg-confirm-password"
                                                    type="password"
                                                    name="confirmPassword"
                                                    autoComplete="new-password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="form-control _social_registration_input"
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                                {errors.confirmPassword?.[0] ? (
                                                    <small className="text-danger">{errors.confirmPassword[0]}</small>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
                                            <div className="form-check _social_registration_form_check">
                                                <input
                                                    className="form-check-input _social_registration_form_check_input"
                                                    type="checkbox"
                                                    name="terms"
                                                    id="flexRadioDefault2"
                                                    checked={agreed}
                                                    onChange={(e) => setAgreed(e.target.checked)}
                                                    disabled={isSubmitting}
                                                />
                                                <label
                                                    className="form-check-label _social_registration_form_check_label"
                                                    htmlFor="flexRadioDefault2"
                                                >
                                                    I agree to terms & conditions
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    {formError ? (
                                        <div className="row">
                                            <div className="col-12">
                                                <p className="text-danger _mar_t16 mb-0">{formError}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="row">
                                        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                                            <div className="_social_registration_form_btn _mar_t40 _mar_b60">
                                                <button
                                                    type="submit"
                                                    className="_social_registration_form_btn_link _btn1"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? "Creating..." : "Login now"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                <div className="row">
                                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                        <div className="_social_registration_bottom_txt">
                                            <p className="_social_registration_bottom_txt_para">
                                                Already have an account? <Link href="/auth/login">Login now</Link>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
